"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import TransactionFormClient from "./TransactionFormClient";
import CreateAccountClient from "./CreateAccountClient";

export default function AccountingModalsClient({ accounts }: { accounts: any[] }) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowAccountModal(true)}
          className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
        <button
          onClick={() => setShowTransactionModal(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-xl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowTransactionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              ✕
            </button>
            <div className="p-2">
               <TransactionFormClient 
                 accounts={accounts} 
                 onSuccessCallback={() => setShowTransactionModal(false)} 
               />
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-xl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              ✕
            </button>
            <div className="p-2">
              <CreateAccountClient 
                onSuccessCallback={() => setShowAccountModal(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
