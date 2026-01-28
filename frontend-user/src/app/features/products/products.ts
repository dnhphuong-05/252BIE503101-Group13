import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discount: number;
  thumbnail: string;
  images: string[];
  sizes: string[];
  colors: string[];
  material: string;
  dynasty: string;
  origin: string;
  stock: number;
  rating: number;
  sold: number;
  description: string;
  featured?: boolean;
  new?: boolean;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  count?: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];

  // Filter states
  selectedCategory: string = '';
  selectedColors: string[] = [];
  selectedPrice = '9000000';
  sortBy = 'Alphabetically A-Z';
  itemsPerPage = 9;
  currentPage = 1;

  // Available filters
  availableColors = ['Đỏ', 'Vàng', 'Xanh', 'Nâu', 'Đen', 'Trắng', 'Tím', 'Hồng'];
  priceRange = '0-9000000';
  sortOptions = [
    'Alphabetically A-Z',
    'Alphabetically Z-A',
    'Price Low to High',
    'Price High to Low',
    'Newest First',
    'Best Sellers',
  ];

  constructor() {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.filterProducts();
  }

  loadProducts() {
    // Load from data - in real app, would call a service
    this.products = [
      {
        id: 'SP001',
        name: 'Áo Nhật Bình Hoa Văn Phượng',
        category: 'nhat-binh',
        price: 3500000,
        discount: 15,
        thumbnail: 'assets/images/products/sp001/thumbnail.jpg',
        images: [
          'assets/images/products/sp001/pos1.jpg',
          'assets/images/products/sp001/pos2.jpg',
          'assets/images/products/sp001/pos3.jpg',
          'assets/images/products/sp001/pos4.jpg',
        ],
        sizes: ['S', 'M', 'L'],
        colors: ['Vàng', 'Đỏ son'],
        material: 'Gấm thêu tay',
        dynasty: 'Nguyễn',
        origin: 'Cung đình Huế',
        stock: 12,
        rating: 4.9,
        sold: 86,
        description: 'Áo Nhật Bình dành cho nghi lễ cung đình, hoa văn phượng hoàng thêu thủ công.',
        featured: true,
        new: false,
        tags: ['cao-cap', 'cung-dinh'],
      },
      {
        id: 'SP002',
        name: 'Áo Ngũ Thân Tay Chẽn Truyền Thống',
        category: 'ngu-than-chen',
        price: 1800000,
        discount: 0,
        thumbnail: 'assets/images/products/sp002/thumbnail.jpg',
        images: [
          'assets/images/products/sp002/pos1.jpg',
          'assets/images/products/sp002/pos2.jpg',
          'assets/images/products/sp002/pos3.jpg',
          'assets/images/products/sp002/pos4.jpg',
        ],
        sizes: ['M', 'L', 'XL'],
        colors: ['Xanh lam', 'Nâu'],
        material: 'Lụa tơ tằm',
        dynasty: 'Nguyễn',
        origin: 'Bắc Bộ',
        stock: 20,
        rating: 4.7,
        sold: 142,
        description: 'Áo ngũ thân tay chẽn thường dùng trong sinh hoạt và nghi lễ dân gian.',
        featured: false,
        new: false,
        tags: ['truyen-thong', 'lua-tam'],
      },
      {
        id: 'SP003',
        name: 'Áo Tấc Gấm Vân Mây',
        category: 'ao-tac',
        price: 2500000,
        discount: 10,
        thumbnail: 'assets/images/products/sp003/thumbnail.jpg',
        images: [
          'assets/images/products/sp003/pos1.jpg',
          'assets/images/products/sp003/pos2.jpg',
          'assets/images/products/sp003/pos3.jpg',
          'assets/images/products/sp003/pos4.jpg',
        ],
        sizes: ['S', 'M', 'L'],
        colors: ['Đỏ đô', 'Xanh ngọc'],
        material: 'Gấm cao cấp',
        dynasty: 'Nguyễn',
        origin: 'Cung đình',
        stock: 8,
        rating: 4.8,
        sold: 64,
        description: 'Áo Tấc (ngũ thân tay rộng) dùng trong tế lễ và sự kiện truyền thống.',
        featured: true,
        new: false,
        tags: ['le-phuc', 'gam'],
      },
      {
        id: 'SP004',
        name: 'Áo Giao Lĩnh Cổ Truyền',
        category: 'giao-linh',
        price: 1600000,
        discount: 5,
        thumbnail: 'assets/images/products/sp004/thumbnail.jpg',
        images: [
          'assets/images/products/sp004/pos1.jpg',
          'assets/images/products/sp004/pos2.jpg',
          'assets/images/products/sp004/pos3.jpg',
          'assets/images/products/sp004/pos4.jpg',
        ],
        sizes: ['M', 'L'],
        colors: ['Trắng ngà', 'Xám'],
        material: 'Vải the',
        dynasty: 'Lý – Trần',
        origin: 'Đại Việt',
        stock: 15,
        rating: 4.6,
        sold: 91,
        description: 'Áo giao lĩnh cổ xưa, cổ chéo đặc trưng thời Lý – Trần.',
        featured: false,
        new: true,
        tags: ['co-truyen', 'ly-tran'],
      },
      {
        id: 'SP005',
        name: 'Áo Tứ Thân Lụa Nhuộm Chàm',
        category: 'tu-than',
        price: 1200000,
        discount: 0,
        thumbnail: 'assets/images/products/sp005/thumbnail.jpg',
        images: [
          'assets/images/products/sp005/pos1.jpg',
          'assets/images/products/sp005/pos2.jpg',
          'assets/images/products/sp005/pos3.jpg',
          'assets/images/products/sp005/pos4.jpg',
        ],
        sizes: ['Free'],
        colors: ['Nâu', 'Chàm'],
        material: 'Lụa nhuộm thủ công',
        dynasty: 'Dân gian',
        origin: 'Bắc Bộ',
        stock: 25,
        rating: 4.5,
        sold: 180,
        description: 'Áo tứ thân truyền thống của phụ nữ Bắc Bộ, thích hợp biểu diễn và chụp ảnh.',
        featured: false,
        new: false,
        tags: ['dan-gian', 'nhuom-cham'],
      },
      {
        id: 'SP006',
        name: 'Áo Nhật Bình Thêu Rồng Vàng',
        category: 'nhat-binh',
        price: 4200000,
        discount: 20,
        thumbnail: 'assets/images/products/sp006/thumbnail.jpg',
        images: [
          'assets/images/products/sp006/pos1.jpg',
          'assets/images/products/sp006/pos2.jpg',
          'assets/images/products/sp006/pos3.jpg',
          'assets/images/products/sp006/pos4.jpg',
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Vàng kim', 'Đỏ thẫm'],
        material: 'Gấm thêu rồng thủ công',
        dynasty: 'Nguyễn',
        origin: 'Cung đình Huế',
        stock: 5,
        rating: 5.0,
        sold: 32,
        description: 'Áo Nhật Bình cao cấp với họa tiết rồng vàng uy nghi.',
        featured: true,
        new: true,
        tags: ['cao-cap', 'limited'],
      },
      {
        id: 'SP007',
        name: 'Áo Viên Lĩnh Lụa Tơ Tằm',
        category: 'vien-linh',
        price: 1900000,
        discount: 0,
        thumbnail: 'assets/images/products/sp007/thumbnail.jpg',
        images: [
          'assets/images/products/sp007/pos1.jpg',
          'assets/images/products/sp007/pos2.jpg',
          'assets/images/products/sp007/pos3.jpg',
          'assets/images/products/sp007/pos4.jpg',
        ],
        sizes: ['M', 'L'],
        colors: ['Hồng phấn', 'Xanh nhạt'],
        material: 'Lụa tơ tằm cao cấp',
        dynasty: 'Nguyễn',
        origin: 'Huế',
        stock: 18,
        rating: 4.7,
        sold: 76,
        description: 'Áo viên lĩnh thanh lịch, cổ tròn đặc trưng.',
        featured: false,
        new: true,
        tags: ['thanh-lich', 'lua-tam'],
      },
      {
        id: 'SP008',
        name: 'Áo Bào Lễ Nam Giới',
        category: 'bao-le',
        price: 2100000,
        discount: 10,
        thumbnail: 'assets/images/products/sp008/thumbnail.jpg',
        images: [
          'assets/images/products/sp008/pos1.jpg',
          'assets/images/products/sp008/pos2.jpg',
          'assets/images/products/sp008/pos3.jpg',
          'assets/images/products/sp008/pos4.jpg',
        ],
        sizes: ['M', 'L', 'XL'],
        colors: ['Đen', 'Nâu đất'],
        material: 'Gấm dày',
        dynasty: 'Nguyễn',
        origin: 'Trung Bộ',
        stock: 14,
        rating: 4.6,
        sold: 58,
        description: 'Áo bào lễ nam giới dùng trong các nghi lễ tế lễ.',
        featured: false,
        new: false,
        tags: ['nam-gioi', 'le-phuc'],
      },
      {
        id: 'SP009',
        name: 'Áo Đối Khâm Hoa Sen',
        category: 'doi-kham',
        price: 1700000,
        discount: 5,
        thumbnail: 'assets/images/products/sp009/thumbnail.jpg',
        images: [
          'assets/images/products/sp009/pos1.jpg',
          'assets/images/products/sp009/pos2.jpg',
          'assets/images/products/sp009/pos3.jpg',
          'assets/images/products/sp009/pos4.jpg',
        ],
        sizes: ['S', 'M', 'L'],
        colors: ['Trắng', 'Hồng sen'],
        material: 'Lụa thêu',
        dynasty: 'Dân gian',
        origin: 'Nam Bộ',
        stock: 22,
        rating: 4.5,
        sold: 95,
        description: 'Áo đối khâm với họa tiết hoa sen đối xứng tinh tế.',
        featured: false,
        new: false,
        tags: ['hoa-sen', 'dan-gian'],
      },
    ];
  }

  loadCategories() {
    this.categories = [
      { id: 'nhat-binh', name: 'Áo Nhật Bình', count: 4 },
      { id: 'ngu-than-chen', name: 'Áo Ngũ Thân Tay Chẽn', count: 3 },
      { id: 'ao-tac', name: 'Áo Tấc', count: 2 },
      { id: 'giao-linh', name: 'Áo Giao Lĩnh', count: 2 },
      { id: 'vien-linh', name: 'Áo Viên Lĩnh', count: 1 },
      { id: 'tu-than', name: 'Áo Tứ Thân', count: 3 },
      { id: 'bao-le', name: 'Áo Bào Lễ', count: 1 },
      { id: 'doi-kham', name: 'Áo Đối Khâm', count: 1 },
    ];
  }

  filterProducts() {
    let filtered = [...this.products];

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter((p) => p.category === this.selectedCategory);
    }

    // Filter by color
    if (this.selectedColors.length > 0) {
      filtered = filtered.filter((p) =>
        p.colors.some((color) => this.selectedColors.includes(color)),
      );
    }

    // Filter by price
    const maxPrice = parseInt(this.selectedPrice);
    filtered = filtered.filter((p) => p.price <= maxPrice);

    // Sort
    this.sortProducts(filtered);

    this.filteredProducts = filtered;
    this.currentPage = 1;
  }

  sortProducts(products: Product[]) {
    switch (this.sortBy) {
      case 'Alphabetically A-Z':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'Alphabetically Z-A':
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'Price Low to High':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'Price High to Low':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'Newest First':
        products.sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0));
        break;
      case 'Best Sellers':
        products.sort((a, b) => b.sold - a.sold);
        break;
    }
  }

  toggleColor(color: string) {
    const index = this.selectedColors.indexOf(color);
    if (index > -1) {
      this.selectedColors.splice(index, 1);
    } else {
      this.selectedColors.push(color);
    }
    this.filterProducts();
  }

  selectCategory(categoryId: string) {
    this.selectedCategory = this.selectedCategory === categoryId ? '' : categoryId;
    this.filterProducts();
  }

  onPriceChange() {
    this.filterProducts();
  }

  onSortChange() {
    this.filterProducts();
  }

  getDiscountedPrice(price: number, discount: number): number {
    return price - (price * discount) / 100;
  }

  getPaginatedProducts() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredProducts.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      window.scrollTo(0, 0);
    }
  }

  resetFilters() {
    this.selectedCategory = '';
    this.selectedColors = [];
    this.selectedPrice = '9000000';
    this.sortBy = 'Alphabetically A-Z';
    this.filterProducts();
  }

  getColorValue(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      Đỏ: '#d32f2f',
      Vàng: '#f2d9a0',
      Xanh: '#1976d2',
      Nâu: '#795548',
      Đen: '#212121',
      Trắng: '#f5f5f5',
      Tím: '#7b1fa2',
      Hồng: '#e91e63',
    };
    return colorMap[colorName] || '#cccccc';
  }

  // For Math object access in template
  Math = Math;
}
