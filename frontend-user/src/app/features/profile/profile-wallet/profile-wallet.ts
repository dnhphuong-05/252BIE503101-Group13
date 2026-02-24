import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import {
  AccountService,
  LoyaltyTransaction,
} from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { BuyOrderService, BuyOrderListItem } from '../../../services/buy-order.service';
import { RentOrderService, RentOrderListItem } from '../../../services/rent-order.service';

type ConditionTab = 'buy' | 'rent';
type HistoryFilter = 'all' | 'earned' | 'pending' | 'adjust' | 'expired';

interface OrderIndexEntry {
  code: string;
  amount: number;
  source: 'buy' | 'rent';
  createdAt?: string | null;
}

interface PendingEntry {
  id: string;
  kind: 'buy' | 'rent';
  orderCode: string;
  amount: number;
  points: number;
  status: string;
  paymentStatus: string;
  createdAt?: string | null;
  note: string;
  action: 'pay' | 'sync';
}

interface HistoryRow {
  id: string;
  date?: string | null;
  sourceLabel: string;
  refCode: string;
  amount?: number | null;
  points: number;
  statusLabel: string;
  statusTone: 'success' | 'pending' | 'warning' | 'danger';
  note: string;
  category: 'earn' | 'spend' | 'adjust' | 'pending';
}

@Component({
  selector: 'app-profile-wallet',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-wallet.html',
  styleUrl: './profile-wallet.css',
})
export class ProfileWalletComponent implements OnInit {
  totalPoints = 0;
  availablePoints = 0;
  tierPoints = 0;
  pendingPoints = 0;
  maxTierPoints = 3000;
  tierName = 'Classic';
  nextTierName: string | null = 'Heritage';
  pointsToNextTier = 0;
  progressPercent = 0;

  activeConditionTab: ConditionTab = 'buy';
  historyFilter: HistoryFilter = 'all';

  pointRules = [
    { min: 2000000, points: 15 },
    { min: 1000000, points: 10 },
    { min: 300000, points: 5 },
  ];

  transactions: LoyaltyTransaction[] = [];
  pendingEntries: PendingEntry[] = [];
  historyRows: HistoryRow[] = [];
  pendingHistoryRows: HistoryRow[] = [];

  private buyOrders: BuyOrderListItem[] = [];
  private rentOrders: RentOrderListItem[] = [];
  private orderIndex = new Map<string, OrderIndexEntry>();
  private transactionRefIds = new Set<string>();

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private buyOrderService: BuyOrderService,
    private rentOrderService: RentOrderService,
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  setConditionTab(tab: ConditionTab) {
    this.activeConditionTab = tab;
  }

  setHistoryFilter(filter: HistoryFilter) {
    this.historyFilter = filter;
  }

  get filteredHistoryRows(): HistoryRow[] {
    switch (this.historyFilter) {
      case 'earned':
        return this.historyRows.filter((row) => row.category === 'earn');
      case 'pending':
        return this.pendingHistoryRows;
      case 'adjust':
        return this.historyRows.filter((row) => row.category === 'adjust');
      case 'expired':
        return [];
      default:
        return this.historyRows;
    }
  }

  formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  }

  formatPoints(value: number): string {
    const normalized = Number(value) || 0;
    return normalized > 0 ? `+${normalized}` : `${normalized}`;
  }

  getPendingNote(entry: PendingEntry): string {
    if (entry.action === 'pay') return 'Thanh toán để nhận điểm';
    return 'Hệ thống sẽ tự đồng bộ khi bạn mở trang tài khoản';
  }

  getPendingActionLabel(entry: PendingEntry): string {
    return entry.action === 'pay' ? 'Thanh toán để nhận điểm' : 'Sẽ tự cộng khi đồng bộ';
  }

  getOrderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      completed: 'Hoàn tất',
      closed: 'Đã đóng',
    };
    return map[status] || status || '-';
  }

  getPaymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      paid: 'Đã thanh toán',
      unpaid: 'Chưa thanh toán',
      partial: 'Thanh toán một phần',
    };
    return map[status] || status || '-';
  }

  private loadSummary(): void {
    this.accountService.getSummary().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const points = response.data.loyalty?.total_points ?? 0;
          this.totalPoints = points;
          this.availablePoints = points;
          this.updateTier(points);

          const currentUser = this.authService.currentUserValue;
          if (currentUser) {
            this.authService.updateCurrentUser({
              ...currentUser,
              loyalty: {
                ...(currentUser.loyalty || {}),
                total_points: points,
              },
            });
          }
        }
        this.loadTransactions();
        this.loadOrders();
      },
      error: () => {
        this.loadTransactions();
        this.loadOrders();
      },
    });
  }

  private loadTransactions(): void {
    this.accountService.getLoyaltyTransactions(1, 50).subscribe({
      next: (response) => {
        this.transactions = response?.data?.items || [];
        this.transactionRefIds = new Set(
          this.transactions
            .filter((txn) => txn.ref_type === 'order' && txn.ref_id)
            .map((txn) => String(txn.ref_id)),
        );
        this.buildHistoryRows();
        this.refreshPending();
      },
      error: () => {
        this.transactions = [];
        this.transactionRefIds = new Set();
        this.buildHistoryRows();
        this.refreshPending();
      },
    });
  }

  private loadOrders(): void {
    const currentUser = this.authService.currentUserValue as { customerId?: string; user_id?: string } | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;
    if (!userId) {
      this.buyOrders = [];
      this.rentOrders = [];
      this.orderIndex.clear();
      this.refreshPending();
      this.buildHistoryRows();
      return;
    }

    forkJoin({
      buy: this.buyOrderService
        .getUserBuyOrders(userId, 1, 80)
        .pipe(catchError(() => of(null))),
      rent: this.rentOrderService
        .getUserRentOrders(userId, 1, 80)
        .pipe(catchError(() => of(null))),
    }).subscribe((result) => {
      this.buyOrders = result.buy?.data?.items || [];
      this.rentOrders = result.rent?.data?.items || [];
      this.rebuildOrderIndex();
      this.buildHistoryRows();
      this.refreshPending();
    });
  }

  private updateTier(points: number): void {
    const capped = Math.max(0, Math.min(points, this.maxTierPoints));
    this.tierPoints = capped;
    if (capped >= 1000) {
      this.tierName = 'Royal';
      this.nextTierName = null;
      this.pointsToNextTier = 0;
      this.progressPercent = 100;
      return;
    }
    if (capped >= 300) {
      this.tierName = 'Heritage';
      this.nextTierName = 'Royal';
      this.pointsToNextTier = Math.max(0, 1000 - capped);
      this.progressPercent = ((capped - 300) / 700) * 100;
      return;
    }
    this.tierName = 'Classic';
    this.nextTierName = 'Heritage';
    this.pointsToNextTier = Math.max(0, 300 - capped);
    this.progressPercent = (capped / 300) * 100;
  }

  private rebuildOrderIndex(): void {
    this.orderIndex.clear();
    for (const order of this.buyOrders) {
      const refId = order.order_id || order._id || '';
      if (!refId) continue;
      this.orderIndex.set(refId, {
        code: order.order_code || refId,
        amount: order.total_amount ?? 0,
        source: 'buy',
        createdAt: order.created_at || order.createdAt || null,
      });
    }
    for (const order of this.rentOrders) {
      const refId = order.rent_order_id || order._id || '';
      if (!refId) continue;
      const amount =
        order.pricing?.total_due_today ?? order.pricing?.rent_fee_expected ?? 0;
      this.orderIndex.set(refId, {
        code: order.rent_order_code || refId,
        amount,
        source: 'rent',
        createdAt: order.created_at || order.createdAt || null,
      });
    }
  }

  private buildHistoryRows(): void {
    this.historyRows = (this.transactions || []).map((txn) => {
      const refId = txn.ref_id ? String(txn.ref_id) : '';
      const orderMeta = refId ? this.orderIndex.get(refId) : undefined;
      const category = txn.type === 'spend' ? 'spend' : txn.type === 'adjust' ? 'adjust' : 'earn';
      const points = this.normalizePoints(txn);
      const statusLabel =
        category === 'earn' ? 'Đã cộng' : category === 'spend' ? 'Đã trừ' : 'Điều chỉnh';
      const statusTone =
        category === 'earn'
          ? 'success'
          : category === 'spend'
            ? 'danger'
            : 'warning';

      return {
        id: txn.txn_id || refId || `${txn.type}-${txn.created_at}`,
        date: txn.created_at || null,
        sourceLabel: this.resolveSourceLabel(txn, orderMeta),
        refCode: orderMeta?.code || refId || '-',
        amount: orderMeta?.amount ?? null,
        points,
        statusLabel,
        statusTone,
        note: txn.reason || '-',
        category,
      };
    });
    this.pendingHistoryRows = this.pendingEntries.map((entry) => ({
      id: entry.id,
      date: entry.createdAt || null,
      sourceLabel: entry.kind === 'buy' ? 'Đơn mua' : 'Đơn thuê',
      refCode: entry.orderCode,
      amount: entry.amount,
      points: entry.points,
      statusLabel: 'Đang chờ',
      statusTone: 'pending',
      note: entry.note,
      category: 'pending',
    }));
  }

  private refreshPending(): void {
    const pending: PendingEntry[] = [];
    for (const order of this.buyOrders) {
      const status = order.order_status || '';
      if (status !== 'completed') continue;
      const refId = order.order_id || order._id || '';
      if (!refId || this.transactionRefIds.has(refId)) continue;
      const amount = order.total_amount ?? 0;
      const points = this.calculateEarnedPoints(amount);
      if (points <= 0) continue;
      const paymentStatus = order.payment_status || 'unpaid';
      const action = paymentStatus === 'paid' ? 'sync' : 'pay';
      pending.push({
        id: `buy-${refId}`,
        kind: 'buy',
        orderCode: order.order_code || refId,
        amount,
        points,
        status,
        paymentStatus,
        createdAt: order.created_at || order.createdAt || null,
        note: action === 'pay' ? 'Thanh toán để nhận điểm' : 'COD tự đồng bộ',
        action,
      });
    }

    for (const order of this.rentOrders) {
      const status = order.rent_status || '';
      if (status !== 'closed') continue;
      const refId = order.rent_order_id || order._id || '';
      if (!refId || this.transactionRefIds.has(refId)) continue;
      const amount =
        order.pricing?.total_due_today ?? order.pricing?.rent_fee_expected ?? 0;
      const points = this.calculateEarnedPoints(amount);
      if (points <= 0) continue;
      const paymentStatus = order.payment?.payment_status || 'unpaid';
      const action = paymentStatus === 'paid' ? 'sync' : 'pay';
      pending.push({
        id: `rent-${refId}`,
        kind: 'rent',
        orderCode: order.rent_order_code || refId,
        amount,
        points,
        status,
        paymentStatus,
        createdAt: order.created_at || order.createdAt || null,
        note: action === 'pay' ? 'Thanh toán để nhận điểm' : 'COD tự đồng bộ',
        action,
      });
    }

    pending.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    this.pendingEntries = pending;
    this.pendingPoints = pending.reduce((sum, item) => sum + (item.points || 0), 0);
    this.buildHistoryRows();
  }

  private calculateEarnedPoints(amount: number): number {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return 0;
    const rule = this.pointRules.find((item) => value >= item.min);
    return rule ? rule.points : 0;
  }

  private resolveSourceLabel(
    txn: LoyaltyTransaction,
    orderMeta?: OrderIndexEntry,
  ): string {
    if (orderMeta?.source === 'buy') return 'Đơn mua';
    if (orderMeta?.source === 'rent') return 'Đơn thuê';
    if (txn.ref_type === 'admin') return 'Điều chỉnh';
    if (txn.ref_type === 'order') return 'Đơn hàng';
    return 'Hệ thống';
  }

  private normalizePoints(txn: LoyaltyTransaction): number {
    const points = Number(txn.points) || 0;
    if (txn.type === 'spend' && points > 0) return -points;
    return points;
  }
}
