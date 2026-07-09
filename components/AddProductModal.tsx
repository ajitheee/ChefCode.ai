import React, { useState, useEffect } from 'react';
import { InvoiceItem, Product, GLCode } from '../types';
import { GL_CODES } from '../constants';
import { X, Save, Database } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  initialItem: InvoiceItem | null;
  glCodes?: GLCode[]; // the org's DB chart of accounts (falls back to the built-in list)
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, initialItem, glCodes }) => {
  const codes = glCodes && glCodes.length > 0 ? glCodes : GL_CODES;
  const [formData, setFormData] = useState<Product>({
    productNo: '',
    description: '',
    category: '',
    code: ''
  });

  useEffect(() => {
    if (initialItem) {
      setFormData({
        productNo: initialItem.productNumber || '',
        description: initialItem.description,
        category: initialItem.categoryName,
        code: initialItem.glCode
      });
    }
  }, [initialItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleGlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const gl = codes.find(g => g.code === code);
    setFormData({ ...formData, code, category: gl?.category || '' });
  };

  const glOptions = !formData.code || codes.some(g => g.code === formData.code)
    ? codes
    : [{ code: formData.code, category: formData.category || 'AI-assigned' }, ...codes];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-cyan-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Database className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                    Add Product to Database
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-500 mb-4">
                      This will save the product so it is automatically recognized and coded correctly in future invoices.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Product Number <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
                          value={formData.productNo}
                          onChange={(e) => setFormData({...formData, productNo: e.target.value})}
                          placeholder="e.g. 123456 (leave blank if none)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Description</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700">GL Code & Category</label>
                         <select
                            required
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
                            onChange={handleGlChange}
                            value={formData.code || ''}
                         >
                           <option value="">Select a GL code...</option>
                           {glOptions.map((gl) => (
                             <option key={`${gl.code}-${gl.category}`} value={gl.code}>
                               {gl.code} - {gl.category}
                             </option>
                           ))}
                         </select>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-600 text-base font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <Save size={16} className="mr-2" />
                Save Product
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
