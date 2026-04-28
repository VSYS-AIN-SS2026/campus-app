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

export interface Category {
  id: string;
  name: string;
  color: string;
  type: 'art' | 'sprache' | 'vertiefung' | string;
}

// Das ist der Typ für eine Zeile in deiner Übersichtstabelle (die View)
export interface ModuleListItem {
  id: string;
  kuerzel: string;
  name: string;
  start_semester: string;
  koordinator: string;
  version: number;
  categories: Category[]; // Hier kommen die farbigen Tags rein!
}

// 2. Das Hauptmodul (wurde bereinigt, da viele Details jetzt im Course stecken)
export interface ModuleDetails {
  modultyp: string;             // z.B. "WPM"
  semesteranzahl: number;       
  startphase: string;           
  sprache: string;              
}
