/**
 * notes.js — Quick Notes Module
 */

'use strict';

const NotesModule = (() => {
    const DEFAULT_NOTES = [];
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
                notes = val.map(n => typeof n === 'string' ? { id: Date.now() + Math.random(), text: n, done: false } : n);
            } else {
                notes = DEFAULT_NOTES;
            }
        } catch (e) {
            notes = DEFAULT_NOTES;
        }

        renderNotes();

        addNoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNote();
        });
    };

    const renderNotes = () => {
        notesListEl.innerHTML = '';

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

        notes.forEach((note, index) => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item fade-in' + (note.done ? ' note-done' : '');

            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'note-checkbox-wrapper';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'note-checkbox';
            checkbox.checked = note.done;
            checkbox.onchange = () => toggleNoteDone(index);

            const checkmark = document.createElement('span');
            checkmark.className = 'note-checkmark';

            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(checkmark);

            const textWrapper = document.createElement('div');
            textWrapper.className = 'note-text-wrapper';

            const textEl = document.createElement('span');
            textEl.className = 'note-text';
            textEl.textContent = note.text;
            textEl.onclick = () => startEdit(index, textWrapper, textEl, note.text);

            textWrapper.appendChild(textEl);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'note-delete-btn';
            deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
            deleteBtn.onclick = () => removeNote(index);

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
            const newText = inputEl.value.trim();
            if (newText) {
                notes[index].text = newText;
                Storage.set('user_notes', notes);
            }
            renderNotes();
        };

        inputEl.onblur = saveEdit;
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') renderNotes(); // Cancel edit
        };
    };

    const toggleNoteDone = async (index) => {
        notes[index].done = !notes[index].done;
        await Storage.set('user_notes', notes);
        renderNotes();
    };

    const addNote = async () => {
        const text = newNoteInput.value.trim();
        if (!text) return;

        notes.push({ id: Date.now(), text: text, done: false });
        newNoteInput.value = '';

        await Storage.set('user_notes', notes);
        renderNotes();
    };

    const removeNote = async (index) => {
        notes.splice(index, 1);
        await Storage.set('user_notes', notes);
        renderNotes();
    };

    return { init };
})();

// Attach to global scope to allow UI interactions if needed
window.NotesModule = NotesModule;
