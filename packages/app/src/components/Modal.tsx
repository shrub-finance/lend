import React, { useEffect, useRef } from 'react';

  interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {


    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Re-enable body scrolling when the modal is closed or the component unmounts
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]); // Ensure effect runs when isOpen changes

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-shrub-grey-700 bg-opacity-80 z-50 flex justify-center items-center">
      <div ref={modalRef} className="modal-container bg-white rounded-3xl shadow-lg p-4">
        {children}
      </div>
   </div>
  );
};

export default Modal;
