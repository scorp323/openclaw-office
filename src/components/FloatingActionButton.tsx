
import React, { useState } from 'react';
import { Settings, RefreshCw, DollarSign, Heart, SunMoon } from 'lucide-react'; // Assuming lucide-react for icons

const FloatingActionButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleRestartCrons = () => {
    console.log('Restart all crons');
    // Call backend API to restart crons
    setIsOpen(false);
  };

  const handleCheckCosts = () => {
    console.log('Check costs');
    // Call backend API to check costs
    setIsOpen(false);
  };

  const handleTriggerHeartbeat = () => {
    console.log('Trigger heartbeat');
    // Call backend API to trigger heartbeat
    setIsOpen(false);
  };

  const handleToggleWorkMode = () => {
    console.log('Toggle work mode');
    // Call backend API to toggle work mode
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="flex flex-col space-y-2 mb-2">
          <button
            className="p-3 bg-blue-500 text-white rounded-full shadow-lg"
            onClick={handleRestartCrons}
            aria-label="Restart Crons"
          >
            <RefreshCw size={24} />
          </button>
          <button
            className="p-3 bg-green-500 text-white rounded-full shadow-lg"
            onClick={handleCheckCosts}
            aria-label="Check Costs"
          >
            <DollarSign size={24} />
          </button>
          <button
            className="p-3 bg-red-500 text-white rounded-full shadow-lg"
            onClick={handleTriggerHeartbeat}
            aria-label="Trigger Heartbeat"
          >
            <Heart size={24} />
          </button>
          <button
            className="p-3 bg-yellow-500 text-white rounded-full shadow-lg"
            onClick={handleToggleWorkMode}
            aria-label="Toggle Work Mode"
          >
            <SunMoon size={24} />
          </button>
        </div>
      )}
      <button
        className="p-4 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center"
        onClick={toggleOpen}
        aria-label="Quick Actions"
      >
        <Settings size={28} />
      </button>
    </div>
  );
};

export default FloatingActionButton;
