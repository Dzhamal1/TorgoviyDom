import React from 'react'
import { UserPlus, List, ShoppingCart, CreditCard, Truck } from 'lucide-react'

const steps = [
  { icon: UserPlus, title: 'Регистрируйтесь на сайте', description: 'Создайте аккаунт для быстрого оформления заказов' },
  { icon: List, title: 'Выбирайте категорию', description: 'Найдите нужные материалы в каталоге' },
  { icon: ShoppingCart, title: 'Добавляйте в корзину', description: 'Соберите все необходимые товары' },
  { icon: CreditCard, title: 'Оплатите заказ', description: 'Выберите удобный способ оплаты' },
  { icon: Truck, title: 'Получите доставку', description: 'Мы доставим в течение 1–2 дней' }
]

const HowItWorks: React.FC = () => {
  return (
    <section aria-label="Как мы работаем" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-blue-600 text-center mb-12">Как мы работаем</h2>
        <div className="relative">
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-blue-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="flex flex-col items-center text-center relative">
                  <div className="w-28 h-28 bg-white border-4 border-blue-500 rounded-full flex items-center justify-center mb-4 shadow">
                    <Icon className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                    {i + 1}
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1 px-2">{s.title}</h3>
                  <p className="text-gray-600 text-sm px-2">{s.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks


