import { Product } from '../types';
import { MASTER_PRODUCT_DB } from '../constants';

const PRODUCT_STORAGE_KEY = 'chefcode_custom_products';

export const getCustomProducts = (): Product[] => {
  const data = localStorage.getItem(PRODUCT_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getAllProducts = (): Product[] => {
  const custom = getCustomProducts();
  // Merge custom products with master DB
  // Custom products take precedence if duplicates exist (though for this simple app we just append)
  return [...MASTER_PRODUCT_DB, ...custom];
};

export const saveNewProduct = (product: Product) => {
  const custom = getCustomProducts();
  
  // Check if exists in custom
  const exists = custom.some(p => p.productNo === product.productNo || p.description === product.description);
  
  if (!exists) {
    custom.push(product);
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(custom));
  }
};

export const importProductsFromExcel = (products: Product[]) => {
  const custom = getCustomProducts();
  let addedCount = 0;

  products.forEach(product => {
    const exists = custom.some(p => p.productNo === product.productNo || p.description === product.description);
    if (!exists) {
      custom.push(product);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(custom));
  }
  
  return addedCount;
};
