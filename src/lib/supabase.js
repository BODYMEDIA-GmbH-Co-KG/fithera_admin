import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://zdtfrqlqprtswnxniedq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdGZycWxxcHJ0c3dueG5pZWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzk1NjEsImV4cCI6MjA5NTYxNTU2MX0.QYgvrXspW7jDFXxbG2ung6bjosARFh7Z2zuUVPZXWYE'
);

const tr = {
  en: {
    dashboard: 'Dashboard', exhibitors: 'Exhibitors', program: 'Program',
    ads: 'Ads & Banners', notifications: 'Push Notifications',
    feedback: 'Feedback', users: 'Users',
    add: 'Add', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel',
    search: 'Search...', loading: 'Loading...', no_data: 'No data yet.',
    name: 'Name', email: 'Email', phone: 'Phone', website: 'Website',
    description: 'Description', category: 'Category', booth: 'Booth',
    title: 'Title', speaker: 'Speaker', start: 'Start', end: 'End',
    track: 'Track', type: 'Type', active: 'Active', inactive: 'Inactive',
    actions: 'Actions', priority: 'Priority', placement: 'Placement',
    image_url: 'Image URL', link_url: 'Link URL',
    saved: 'Saved!', deleted: 'Deleted!', error: 'An error occurred.',
    confirm_delete: 'Are you sure?', approve: 'Approve', reject: 'Reject',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    logout: 'Logout', password: 'Password',
    total_exhibitors: 'Total Exhibitors', total_sessions: 'Total Sessions',
    total_users: 'Registered Users', total_feedback: 'Feedback Received',
    send: 'Send', message: 'Message',
  },
  de: {
    dashboard: 'Dashboard', exhibitors: 'Aussteller', program: 'Programm',
    ads: 'Anzeigen & Banner', notifications: 'Push-Benachrichtigungen',
    feedback: 'Feedback', users: 'Benutzer',
    add: 'Hinzufügen', edit: 'Bearbeiten', delete: 'Löschen', save: 'Speichern', cancel: 'Abbrechen',
    search: 'Suchen...', loading: 'Laden...', no_data: 'Noch keine Daten.',
    name: 'Name', email: 'E-Mail', phone: 'Telefon', website: 'Website',
    description: 'Beschreibung', category: 'Kategorie', booth: 'Stand',
    title: 'Titel', speaker: 'Referent', start: 'Beginn', end: 'Ende',
    track: 'Bühne', type: 'Typ', active: 'Aktiv', inactive: 'Inaktiv',
    actions: 'Aktionen', priority: 'Priorität', placement: 'Platzierung',
    image_url: 'Bild-URL', link_url: 'Link-URL',
    saved: 'Gespeichert!', deleted: 'Gelöscht!', error: 'Ein Fehler ist aufgetreten.',
    confirm_delete: 'Wirklich löschen?', approve: 'Freigeben', reject: 'Ablehnen',
    pending: 'Ausstehend', approved: 'Freigegeben', rejected: 'Abgelehnt',
    logout: 'Abmelden', password: 'Passwort',
    total_exhibitors: 'Aussteller gesamt', total_sessions: 'Sessions gesamt',
    total_users: 'Registrierte Benutzer', total_feedback: 'Feedback erhalten',
    send: 'Senden', message: 'Nachricht',
  }
};

export const t = (lang, key) => tr[lang]?.[key] || tr['en']?.[key] || key;
