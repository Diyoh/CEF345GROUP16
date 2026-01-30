import { useContext } from 'react';
import { AppContext } from './store';

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppStore must be used within AppProvider");
    return context;
};
