import { NetbookState } from '@/types/supply-chain-types';

interface ProgressStepperProps {
  currentState: 'FABRICADA' | 'HW_APROBADO' | 'SW_VALIDADO' | 'DISTRIBUIDA';
}

export function ProgressStepper({ currentState }: ProgressStepperProps) {
  // Map State enum values to their corresponding numeric IDs
  const stateToId: Record<typeof currentState, number> = {
    'FABRICADA': 0,
    'HW_APROBADO': 1,
    'SW_VALIDADO': 2,
    'DISTRIBUIDA': 3
  };

  const currentId = stateToId[currentState];

  const states = [
    { id: 0, label: 'Fabricada', icon: '🏭' },
    { id: 1, label: 'HW Aprobado', icon: '🔧' },
    { id: 2, label: 'SW Validado', icon: '💻' },
    { id: 3, label: 'Distribuida', icon: '🎒' }
  ];

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {states.map((state, index) => (
        <div key={state.id} className="flex flex-col items-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl
              ${currentId >= state.id ? 'bg-primary' : 'bg-gray-300'}
              ${index < states.length - 1 ? 'z-10' : ''}
            `}
          >
            {state.icon}
          </div>
          <div
            className={`text-xs mt-2 text-center min-w-[80px] px-1
              ${currentId >= state.id ? 'font-medium text-primary' : 'text-gray-500'}
            `}
          >
            {state.label}
          </div>
          
          {/* Connection line between steps */}
          {index < states.length - 1 && (
            <div
              className={`absolute w-24 h-0.5 mt-6
                ${currentId > state.id ? 'bg-primary' : 'bg-gray-300'}
              `}
              style={{ marginLeft: '30px' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}