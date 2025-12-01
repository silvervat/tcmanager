
import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ViewerMock } from './components/ViewerMock';
import { MOCK_MODEL_PARTS } from './constants';
import { AssemblyPart, InstallationRecord, DeliveryRecord, BoltingRecord, AppMode, PartLogEntry } from './types';

// Helper to create log entry
const createLog = (action: string, user: string = "Praegune Kasutaja"): PartLogEntry => ({
  timestamp: new Date().toISOString(),
  action,
  user
});

function App() {
  // Main state holding all model parts
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  // Current active active mode (tabs)
  const [mode, setMode] = useState<AppMode>('installation');
  
  // Simulation state for "Trimble Connect Assembly Selection"
  // Default is true as per Trimble Connect defaults usually
  const [assemblySelectionEnabled, setAssemblySelectionEnabled] = useState(true);

  // Initialize simulated "Trimble Connect" data
  useEffect(() => {
    setParts(MOCK_MODEL_PARTS);
  }, []);

  // Handle clicking a part in the 3D viewer
  const handlePartClick = useCallback((id: string) => {
    // Only allow selection in installation, delivery, or bolts modes
    if (mode === 'statistics') return;

    // Check validity before allowing selection (Optional: visual feedback handled in Sidebar validation banner)
    // But we still allow selection logic to run so user can see what they clicked, 
    // blocking the SAVE action is the critical part implemented in Sidebar.

    setParts(prevParts => 
      prevParts.map(part => {
        if (part.id === id) {
          // Toggle selection status
          return { ...part, isSelected: !part.isSelected };
        }
        return part;
      })
    );
  }, [mode]);

  // Handle removing a single part from the sidebar list
  const handleRemovePart = useCallback((id: string) => {
    setParts(prevParts => 
      prevParts.map(part => 
        part.id === id ? { ...part, isSelected: false } : part
      )
    );
  }, []);

  // Handle clearing the entire selection
  const handleClearSelection = useCallback(() => {
    setParts(prevParts => 
      prevParts.map(part => ({ ...part, isSelected: false }))
    );
  }, []);

  // Generic handler to set selection to a specific list of IDs (used by History groupings)
  const handleSetSelection = useCallback((ids: string[]) => {
    if (!ids || ids.length === 0) {
      handleClearSelection();
      return;
    }
    
    const idSet = new Set(ids);
    setParts(prevParts => 
      prevParts.map(part => ({
        ...part,
        isSelected: idSet.has(part.id)
      }))
    );
  }, [handleClearSelection]);

  // Handle saving the INSTALLATION data
  const handleSaveInstallation = useCallback((data: InstallationRecord) => {
    setParts(prevParts => 
      prevParts.map(part => {
        if (part.isSelected) {
          const newLog = createLog(`Paigaldatud: ${data.method}`);
          return { 
            ...part, 
            isSelected: false, // Deselect after saving
            installation: {
              installers: data.installerNames, // Array
              date: data.date,
              method: data.method
            },
            logs: [...part.logs, newLog]
          };
        }
        return part;
      })
    );
    console.log("Saved Installation:", data);
  }, []);

  // Handle saving the BOLTING data
  const handleSaveBolting = useCallback((data: BoltingRecord) => {
    setParts(prevParts => 
      prevParts.map(part => {
        if (part.isSelected) {
          const newLog = createLog(`Poldid pingutatud`);
          return { 
            ...part, 
            isSelected: false,
            bolting: {
              installer: data.installerName, // Single
              date: data.date
            },
            logs: [...part.logs, newLog]
          };
        }
        return part;
      })
    );
    console.log("Saved Bolting:", data);
  }, []);

  // Handle saving the DELIVERY data
  const handleSaveDelivery = useCallback((data: DeliveryRecord) => {
    setParts(prevParts => 
      prevParts.map(part => {
        if (part.isSelected) {
          const newLog = createLog(`Tarnitud: ${data.vehicle}`);
          return { 
            ...part, 
            isSelected: false, // Deselect after saving
            delivery: {
              vehicle: data.vehicle,
              date: data.date,
              arrivalTime: data.arrivalTime,
              unloadingTime: data.unloadingTime
            },
            logs: [...part.logs, newLog]
          };
        }
        return part;
      })
    );
    console.log("Saved Delivery:", data);
  }, []);

  // Handle BULK UPDATE (Editing existing records)
  const handleBulkUpdate = useCallback((ids: string[], mode: AppMode, data: any) => {
    const idSet = new Set(ids);
    setParts(prevParts => 
      prevParts.map(part => {
        if (idSet.has(part.id)) {
          let updatedPart = { ...part };
          let actionDesc = '';

          if (mode === 'installation') {
             updatedPart.installation = { 
               installers: data.installerNames, 
               date: data.date, 
               method: data.method 
             };
             actionDesc = 'Muudeti paigaldusandmeid';
          } else if (mode === 'delivery') {
             updatedPart.delivery = { 
               vehicle: data.vehicle, 
               date: data.date, 
               arrivalTime: data.arrivalTime, 
               unloadingTime: data.unloadingTime 
             };
             actionDesc = 'Muudeti tarneandmeid';
          } else if (mode === 'bolts') {
             updatedPart.bolting = { 
               installer: data.installerName, 
               date: data.date 
             };
             actionDesc = 'Muudeti poltide andmeid';
          }

          if (actionDesc) {
            updatedPart.logs = [...updatedPart.logs, createLog(actionDesc)];
          }
          return updatedPart;
        }
        return part;
      })
    );
  }, []);

  // Handle DELETING specific data from parts (Used in Edit Modal to remove parts from a group)
  const handleDeleteData = useCallback((ids: string[], mode: AppMode) => {
    const idSet = new Set(ids);
    setParts(prevParts => 
      prevParts.map(part => {
        if (idSet.has(part.id)) {
          let updatedPart = { ...part };
          let actionDesc = '';

          if (mode === 'installation') {
            updatedPart.installation = undefined;
            actionDesc = 'Eemaldati paigaldusest';
          } else if (mode === 'delivery') {
            updatedPart.delivery = undefined;
            actionDesc = 'Eemaldati tarnest';
          } else if (mode === 'bolts') {
            updatedPart.bolting = undefined;
            actionDesc = 'Eemaldati poltide nimekirjast';
          }

          if (actionDesc) {
            updatedPart.logs = [...updatedPart.logs, createLog(actionDesc)];
          }
          return updatedPart;
        }
        return part;
      })
    );
  }, []);

  // Filter parts that are currently 'selected' (highlighted)
  const selectedParts = parts.filter(p => p.isSelected);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">
      {/* Left Sidebar */}
      <div className="flex-none z-10 h-full">
        <Sidebar 
          selectedParts={selectedParts}
          allParts={parts}
          mode={mode}
          assemblySelectionEnabled={assemblySelectionEnabled}
          onModeChange={setMode}
          onSaveInstallation={handleSaveInstallation}
          onSaveDelivery={handleSaveDelivery}
          onSaveBolting={handleSaveBolting}
          onClearSelection={handleClearSelection}
          onRemovePart={handleRemovePart}
          onSetSelection={handleSetSelection}
          onBulkUpdate={handleBulkUpdate}
          onDeleteData={handleDeleteData}
        />
      </div>

      {/* Main Content (3D Viewer) */}
      <div className="flex-1 relative h-full">
        <ViewerMock 
          parts={parts} 
          onPartClick={handlePartClick} 
          mode={mode}
          assemblySelectionEnabled={assemblySelectionEnabled}
          onToggleAssemblySelection={() => setAssemblySelectionEnabled(!assemblySelectionEnabled)}
        />
      </div>
    </div>
  );
}

export default App;
