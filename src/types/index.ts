export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface ContactFormData {
  name: string;
  phone: string;
  message: string;
  preferredContact: 'phone' | 'whatsapp' | 'telegram';
}

export interface OrderData {
  items: CartItem[];
  total: number;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
}