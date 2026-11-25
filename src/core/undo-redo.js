// Undo/redo via the command pattern. A command pairs a forward action (`redo`)
// with its inverse (`undo`); the manager keeps bounded undo/redo stacks.

export function createUndoRedo({ max = 50 } = {}) {
  const undoStack = [];
  const redoStack = [];

  function execute(command) {
    if (typeof command.redo !== 'function') return;
    command.redo();
    undoStack.push(command);
    redoStack.length = 0; // a new action invalidates the redo history
    if (undoStack.length > max) undoStack.shift();
  }

  function undo() {
    const command = undoStack.pop();
    if (!command) return false;
    if (typeof command.undo === 'function') command.undo();
    redoStack.push(command);
    return true;
  }

  function redo() {
    const command = redoStack.pop();
    if (!command) return false;
    if (typeof command.redo === 'function') command.redo();
    undoStack.push(command);
    return true;
  }

  return {
    execute,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    reset: () => {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}

export const undoRedo = createUndoRedo();
