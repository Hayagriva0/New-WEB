/**
 * notes.js — Quick Notes Module
 */

'use strict';

const NotesModule = (() => {
    const DEFAULT_NOTES = [];
    const MAX_NOTE_LENGTH = 500;
    const MAX_NOTES = 100;
    let notes = [];

    let notesListEl;
    let addNoteForm;
    let newNoteInput;

    const init = async () => {
        notesListEl = document.getElementById('notes-list');
        addNoteForm = document.getElementById('add-note-form');
        newNoteInput = document.getElementById('new-note-input');

        if (!notesListEl || !addNoteForm || !newNoteInput) return;

        try {
            const val = await Storage.get('user_notes');
            if (val && Array.isArray(val)) {
                // Upgrade legacy string notes to objects if necessary
                notes = val.map(function (n) {
                    return typeof n === 'string'
                        ? { id: Date.now() + Math.random(), text: n, done: false }
                        : n;
                });
            } else {
                notes = DEFAULT_NOTES;
            }
        } catch (e) {
            notes = DEFAULT_NOTES;
        }

        renderNotes();

        addNoteForm.addEventListener('submit', function (e) {
            e.preventDefault();
            addNote();
        });
    };

    /**
     * Create the close/delete SVG icon using DOM APIs (no innerHTML).
     */
    function createDeleteIcon() {
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        var line1 = document.createElementNS(svgNS, 'line');
        line1.setAttribute('x1', '18');
        line1.setAttribute('y1', '6');
        line1.setAttribute('x2', '6');
        line1.setAttribute('y2', '18');

        var line2 = document.createElementNS(svgNS, 'line');
        line2.setAttribute('x1', '6');
        line2.setAttribute('y1', '6');
        line2.setAttribute('x2', '18');
        line2.setAttribute('y2', '18');

        svg.appendChild(line1);
        svg.appendChild(line2);
        return svg;
    }

    /**
     * Sanitize user note text: trim and remove control characters.
     */
    function sanitizeNoteText(text) {
        var s = (text || '').trim();
        /* Remove control characters (U+0000–U+001F, U+007F) except common whitespace */
        s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return s.substring(0, MAX_NOTE_LENGTH);
    }

    const renderNotes = () => {
        /* Clear list safely (no innerHTML) */
        while (notesListEl.firstChild) {
            notesListEl.removeChild(notesListEl.firstChild);
        }

        if (notes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '16px';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = 'var(--text-4)';
            emptyMsg.style.fontSize = '12px';
            emptyMsg.textContent = 'No notes yet. Add one below.';
            notesListEl.appendChild(emptyMsg);
            return;
        }

        notes.forEach(function (note, index) {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item fade-in' + (note.done ? ' note-done' : '');

            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'note-checkbox-wrapper';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'note-checkbox';
            checkbox.checked = note.done;
            checkbox.addEventListener('change', function () {
                toggleNoteDone(index);
            });

            const checkmark = document.createElement('span');
            checkmark.className = 'note-checkmark';

            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(checkmark);

            const textWrapper = document.createElement('div');
            textWrapper.className = 'note-text-wrapper';

            const textEl = document.createElement('span');
            textEl.className = 'note-text';
            textEl.textContent = note.text;
            textEl.addEventListener('click', function () {
                startEdit(index, textWrapper, textEl, note.text);
            });

            textWrapper.appendChild(textEl);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'note-delete-btn';
            deleteBtn.appendChild(createDeleteIcon());
            deleteBtn.addEventListener('click', function () {
                removeNote(index);
            });

            noteEl.appendChild(checkboxWrapper);
            noteEl.appendChild(textWrapper);
            noteEl.appendChild(deleteBtn);
            notesListEl.appendChild(noteEl);
        });

        // Auto scroll to bottom
        notesListEl.scrollTop = notesListEl.scrollHeight;
    };

    const startEdit = (index, wrapper, textEl, oldText) => {
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.className = 'note-edit-input';
        inputEl.value = oldText;

        wrapper.replaceChild(inputEl, textEl);
        inputEl.focus();

        const saveEdit = () => {
            const newText = sanitizeNoteText(inputEl.value);
            if (newText) {
                notes[index].text = newText;
                Storage.set('user_notes', notes);
            }
            renderNotes();
        };

        inputEl.addEventListener('blur', saveEdit);
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') renderNotes(); // Cancel edit
        });
    };

    const toggleNoteDone = async (index) => {
        if (typeof index !== 'number' || index < 0 || index >= notes.length) return;
        notes[index].done = !notes[index].done;
        await Storage.set('user_notes', notes);
        renderNotes();
    };

    const addNote = async () => {
        const text = sanitizeNoteText(newNoteInput.value);
        if (!text) return;
        if (notes.length >= MAX_NOTES) return;

        notes.push({ id: Date.now(), text: text, done: false });
        newNoteInput.value = '';

        await Storage.set('user_notes', notes);
        renderNotes();
    };

    const removeNote = async (index) => {
        if (typeof index !== 'number' || index < 0 || index >= notes.length) return;
        notes.splice(index, 1);
        await Storage.set('user_notes', notes);
        renderNotes();
    };

    return { init };
})();
