import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let addedProduct = cart.find(item => item.id === productId)

      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      let updatedCart

      if (!addedProduct) {
        const { data: product } = await api.get<Product>(`/products/${productId}`)

        if (!product) throw new Error("Erro na adição do produto")

        product.amount = 1
        updatedCart = [...cart, product]
      } else {
        if (!(addedProduct.amount < productStock.amount)) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        updatedCart = cart.map(item => {
          if (item.id === productId) item.amount++
          return item
        })
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let addedProduct = cart.find(item => item.id === productId)
      if (!addedProduct) {
        throw new Error("Erro na remoção do produto")
      }
      let updatedCart = cart.filter(item => item.id !== productId)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (!(amount <= productStock.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      let updatedCart = cart.map(item => {
        if (item.id === productId) {
          item.amount = amount
        }
        return item
      })

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

      setCart(updatedCart)

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
