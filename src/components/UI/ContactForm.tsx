import React, { useState } from 'react';
import { Phone, MessageCircle, Send, Mail } from 'lucide-react';
import { saveContactMessage } from '../../services/notificationService';
import LoadingSpinner from './LoadingSpinner';

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    preferredContact: 'phone' as 'phone' | 'whatsapp' | 'telegram',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await saveContactMessage({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        message: formData.message,
        preferredContact: formData.preferredContact,
      });

      if (result.success) {
        setSubmitted(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setSubmitted(false);
          setFormData({
            name: '',
            phone: '',
            email: '',
            message: '',
            preferredContact: 'phone',
          });
        }, 3000);
      } else {
        alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
    }
    
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 mb-2">
          <Mail size={32} className="mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">Спасибо за обращение!</h3>
        <p className="text-green-700">Мы свяжемся с вами в ближайшее время.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Свяжитесь с нами</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Ваше имя *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Введите ваше имя"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Телефон *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+7 (___) ___-__-__"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="preferredContact" className="block text-sm font-medium text-gray-700 mb-1">
            Предпочтительный способ связи
          </label>
          <select
            id="preferredContact"
            name="preferredContact"
            value={formData.preferredContact}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="phone">Телефон</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Сообщение
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Расскажите о ваших потребностях или задайте вопрос"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" text="" />
              <span>Отправляется...</span>
            </>
          ) : (
            <>
              <Send size={20} />
              <span>Отправить сообщение</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Или свяжитесь с нами напрямую:</p>
        <div className="flex space-x-4 text-sm">
          <a
            href="tel:+79001234567"
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
          >
            <Phone size={16} />
            <span>Позвонить</span>
          </a>
          <a
            href="https://wa.me/79001234567"
            className="flex items-center space-x-1 text-green-600 hover:text-green-800"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </a>
          <a
            href="https://t.me/tdstroika"
            className="flex items-center space-x-1 text-blue-500 hover:text-blue-700"
          >
            <Send size={16} />
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </form>
  );
};

export default ContactForm;