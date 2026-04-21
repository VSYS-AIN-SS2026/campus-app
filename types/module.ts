// types/module.ts

export interface ModuleDetails {
  modultyp: string;             
  semesteranzahl: number;       
  startphase: string;           
  sprache: string;              

  workload: {
    kontaktzeit: number;        
    selbststudium: number;      
  };

  voraussetzungen: {
    inhaltlich: string | null;  
    erforderlich_fuer: string | null; 
    kombination: string | null; 
  };

  pruefung: {
    endnoten_zusammensetzung: string;
    benotet_mp: string | null;  
    unbenotet_mp: string | null; 
    leistungsnachweis: string | null; 
  };

  lehr_und_lernformen: string;  
  lernziele: string;
  personale_kompetenzen: string;
  literatur: string;
}