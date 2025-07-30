import React, { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import Modal from '../UI/Modal';
import PrivacyPolicy from '../Legal/PrivacyPolicy';
import TermsOfService from '../Legal/TermsOfService';

const Footer: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  return (
    <>
      <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-orange-500 text-white p-2 rounded-lg">
                <span className="text-xl font-bold">ТД</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Торговый дом</h3>
                <p className="text-sm text-gray-300">Все для стройки</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Ваш надежный партнер в строительстве. Качественные материалы, 
              инструменты и все необходимое для успешной стройки.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Категории товаров</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/category/stroy" className="text-gray-300 hover:text-white transition-colors">Стройматериалы</a></li>
              <li><a href="/category/electrical" className="text-gray-300 hover:text-white transition-colors">Электрика</a></li>
              <li><a href="/category/tools" className="text-gray-300 hover:text-white transition-colors">Инструменты</a></li>
              <li><a href="/category/plumbing" className="text-gray-300 hover:text-white transition-colors">Сантехника</a></li>
              <li><a href="/category/furniture" className="text-gray-300 hover:text-white transition-colors">Мебель</a></li>
              <li><a href="/category/interior" className="text-gray-300 hover:text-white transition-colors">Интерьер</a></li>
              <li><a href="/category/fasteners" className="text-gray-300 hover:text-white transition-colors">Крепежи</a></li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Phone size={16} className="text-orange-500" />
                <a href="tel:+79001234567" className="text-gray-300 hover:text-white transition-colors">
                  +7 (900) 123-45-67
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-orange-500" />
                <a href="mailto:info@td-stroika.ru" className="text-gray-300 hover:text-white transition-colors">
                  info@td-stroika.ru
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-orange-500" />
                <span className="text-gray-300">г. Махачкала, ул. Гаджи Алибегова, 82</span>
              </div>
            </div>
          </div>

          {/* Social and messengers */}
          <div>
            <h4 className="font-semibold mb-4">Связь с нами</h4>
            <div className="space-y-3">
              <a 
                href="https://wa.me/79001234567" 
                className="flex items-center space-x-2 text-gray-300 hover:text-green-400 transition-colors text-sm"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>
              <a 
                href="https://t.me/tdstroika" 
                className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 transition-colors text-sm"
              >
                <Send size={16} />
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © 2025 Торговый дом "Все для стройки". Все права защищены.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0 text-sm text-gray-400">
            <button 
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-white transition-colors"
            >
              Политика конфиденциальности
            </button>
            <button 
              onClick={() => setShowTermsModal(true)}
              className="hover:text-white transition-colors"
            >
              Условия использования
            </button>
          </div>
        </div>
      </div>
      </footer>

      {/* Модальные окна */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Политика конфиденциальности"
        maxWidth="2xl"
      >
        <PrivacyPolicy />
      </Modal>

      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Условия использования"
        maxWidth="2xl"
      >
        <TermsOfService />
      </Modal>
    </>
  );
};

export default Footer;