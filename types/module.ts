// types/module.ts

// 1. Details für ein Teilmodul (Lehrveranstaltung)
export interface CourseDetails {
  workload: {
    kontaktzeit: number | null;        
    selbststudium: number | null;      
  };
  pruefung: {
    endnoten_zusammensetzung: string | null;
    benotet_mp: string | null;  
    unbenotet_mp: string | null; 
    leistungsnachweis: string | null; 
  };
  voraussetzungen: {
    inhaltlich: string | null;  
    erforderlich_fuer: string | null; 
    kombination: string | null; 
  };
  lehr_und_lernformen: string | null;  
  lernziel_fachlich: string | null;
  lernziel_personal: string | null;
  lernziel_methodisch: string | null;
  lehrinhalt: string | null; // Das ist der <ul> HTML-Text
  literatur: string | null;  // Das ist der <ul> HTML-Text
}

// 2. Das Hauptmodul (wurde bereinigt, da viele Details jetzt im Course stecken)
export interface ModuleDetails {
  modultyp: string;             // z.B. "WPM"
  semesteranzahl: number;       
  startphase: string;           
  sprache: string;              
}