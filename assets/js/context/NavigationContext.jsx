import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [nextPath, setNextPath] = useState(null);
    const saveHandlerRef = useRef(null);

    const setSaveHandler = useCallback((fn) => {
        saveHandlerRef.current = fn;
    }, []);

    const attemptNavigation = useCallback((path) => {
        if (isDirty) {
            setNextPath(path);
            setShowConfirmModal(true);
        } else {
            if (typeof path === 'string') {
                window.location.hash = '';
                return true;
            }
            if (typeof path === 'function') path();
        }
        return false;
    }, [isDirty]);

    const confirmNavigation = useCallback(async (save) => {
        if (save && saveHandlerRef.current) {
            try {
                // The handler is stored as a factory: () => handleSaveAll
                const actualHandler = saveHandlerRef.current();
                if (typeof actualHandler === 'function') {
                    await actualHandler();
                }
            } catch (err) {
                console.error("Error saving before navigation:", err);
                return;
            }
        }

        setIsDirty(false);
        setShowConfirmModal(false);

        if (nextPath) {
            if (typeof nextPath === 'string') {
                window.location.href = nextPath;
            } else if (typeof nextPath === 'function') {
                nextPath();
            }
        }
        setNextPath(null);
    }, [nextPath]);

    const cancelNavigation = useCallback(() => {
        setShowConfirmModal(false);
        setNextPath(null);
    }, []);

    const value = useMemo(() => ({
        isDirty,
        setIsDirty,
        showConfirmModal,
        attemptNavigation,
        confirmNavigation,
        cancelNavigation,
        setSaveHandler
    }), [isDirty, showConfirmModal, attemptNavigation, confirmNavigation, cancelNavigation, setSaveHandler]);

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigationGuard = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigationGuard must be used within a NavigationProvider');
    }
    return context;
};
