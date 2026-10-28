import { createContext, useContext } from "react";

interface PersonaContextType {
  activePersona: string | null;
  setActivePersona: (id: string | null) => void;
}

export const PersonaContext = createContext<PersonaContextType>({
  activePersona: null,
  setActivePersona: () => {},
});

export const usePersona = () => useContext(PersonaContext);
