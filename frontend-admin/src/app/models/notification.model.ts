export type AdminNotificationEntityType = 'sales_order' | 'rent_order' | 'contact';

export type AdminNotificationEventType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_received'
  | 'order_cancelled'
  | 'return_requested'
  | 'rent_created'
  | 'rent_confirmed'
  | 'rent_out_for_delivery'
  | 'rent_ongoing'
  | 'rent_return_requested'
  | 'rent_return_label_created'
  | 'rent_return_reminder'
  | 'rent_return_shipped'
  | 'rent_return_received'
  | 'rent_inspected'
  | 'rent_closed'
  | 'rent_cancelled'
  | 'rent_violated'
  | 'deposit_refunded'
  | 'contact_created'
  | 'contact_received'
  | 'contact_handled';

export type AdminNotificationCategory = 'sales' | 'rent' | 'returns' | 'contact';

export interface AdminNotification {
  notification_id: string;
  user_id: string;
  type: AdminNotificationEventType;
  title: string;
  message: string;
  entity_type: AdminNotificationEntityType;
  entity_id: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminNotificationMeta {
  category: AdminNotificationCategory;
  badge: string;
  icon: string;
}

const normalizeLink = (link?: string | null): string => (link || '').trim();

const extractLastSegment = (link: string): string => {
  const segments = link.split('/').filter(Boolean);
  return segments.at(-1) ?? '';
};

const extractQueryParam = (link: string, key: string): string => {
  const [_, queryString] = link.split('?');
  if (!queryString) return '';
  const query = new URLSearchParams(queryString);
  return query.get(key) || '';
};

export const resolveAdminNotificationLink = (notification: AdminNotification): string => {
  const link = normalizeLink(notification.link);

  if (link.startsWith('/contacts?')) {
    const contactId = extractQueryParam(link, 'contact');
    return contactId ? `/contacts/${contactId}` : '/contacts';
  }

  if (link.startsWith('/orders/sales?')) {
    const orderId = extractQueryParam(link, 'order');
    return orderId ? `/orders/sales/${orderId}` : '/orders/sales';
  }

  if (link.startsWith('/orders/rent?')) {
    const orderId = extractQueryParam(link, 'order');
    return orderId ? `/orders/rent/${orderId}` : '/orders/rent';
  }

  if (link.startsWith('/orders/returns?')) {
    const requestId = extractQueryParam(link, 'request');
    return requestId ? `/orders/returns/${requestId}` : '/orders/returns';
  }

  if (link.startsWith('/orders') || link.startsWith('/contacts')) {
    return link;
  }

  if (link.startsWith('/profile/orders/')) {
    return `/orders/sales/${extractLastSegment(link) || notification.entity_id}`;
  }

  if (link.startsWith('/profile/rentals/')) {
    return `/orders/rent/${extractLastSegment(link) || notification.entity_id}`;
  }

  if (notification.entity_type === 'contact') {
    return `/contacts/${notification.entity_id}`;
  }

  if (notification.type === 'return_requested' && link.startsWith('/orders/returns')) {
    const requestId = extractLastSegment(link) || notification.entity_id;
    return `/orders/returns/${requestId}`;
  }

  if (notification.entity_type === 'rent_order') {
    return `/orders/rent/${notification.entity_id}`;
  }

  if (notification.entity_type === 'sales_order') {
    return `/orders/sales/${notification.entity_id}`;
  }

  return '/notifications';
};

export const getAdminNotificationMeta = (
  notification: Pick<AdminNotification, 'type' | 'entity_type'>,
): AdminNotificationMeta => {
  if (
    notification.type === 'contact_created' ||
    notification.type === 'contact_received' ||
    notification.type === 'contact_handled' ||
    notification.entity_type === 'contact'
  ) {
    return {
      category: 'contact',
      badge: 'Liên hệ',
      icon: 'fas fa-envelope-open-text',
    };
  }

  if (notification.type === 'return_requested') {
    return {
      category: 'returns',
      badge: 'Hoàn trả',
      icon: 'fas fa-rotate-left',
    };
  }

  if (notification.entity_type === 'rent_order') {
    if (
      notification.type === 'rent_return_requested' ||
      notification.type === 'rent_return_shipped' ||
      notification.type === 'rent_return_received' ||
      notification.type === 'rent_return_label_created' ||
      notification.type === 'rent_return_reminder'
    ) {
      return {
        category: 'rent',
        badge: 'Trả hàng',
        icon: 'fas fa-truck-fast',
      };
    }

    if (notification.type === 'rent_cancelled' || notification.type === 'rent_violated') {
      return {
        category: 'rent',
        badge: 'Đơn thuê',
        icon: 'fas fa-triangle-exclamation',
      };
    }

    return {
      category: 'rent',
      badge: 'Đơn thuê',
      icon: 'fas fa-calendar-check',
    };
  }

  if (notification.type === 'order_cancelled') {
    return {
      category: 'sales',
      badge: 'Đơn mua',
      icon: 'fas fa-ban',
    };
  }

  if (notification.type === 'order_received') {
    return {
      category: 'sales',
      badge: 'Đơn mua',
      icon: 'fas fa-box-open',
    };
  }

  return {
    category: 'sales',
    badge: 'Đơn mua',
    icon: 'fas fa-bag-shopping',
  };
};

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface ToastMessage {
  id?: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}
