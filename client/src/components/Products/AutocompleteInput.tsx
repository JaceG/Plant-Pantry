import { useState, useRef, useEffect } from 'react';
import './AutocompleteInput.css';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowNew?: boolean;
  newItemLabel?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  disabled,
  allowNew = false,
  newItemLabel = 'Add new',
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(value.toLowerCase())
  );

  // Show "Add new" option at the top if allowNew is enabled and user has typed something
  const showAddNew = allowNew && value.trim() && value.trim().length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (option: string) => {
    onSelect(option);
    onChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // "Add new" is always at index 0, existing options start at index 1
    const totalOptions = (showAddNew ? 1 : 0) + filteredOptions.length;
    
    if (!isOpen || totalOptions === 0) {
      if (e.key === 'Enter' && showAddNew) {
        e.preventDefault();
        handleSelect(value.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < totalOptions - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (showAddNew && highlightedIndex === 0) {
            // "Add new" is at index 0
            handleSelect(value.trim());
          } else if (showAddNew) {
            // Existing options are offset by 1
            handleSelect(filteredOptions[highlightedIndex - 1]);
          } else {
            // No "Add new", existing options start at 0
            handleSelect(filteredOptions[highlightedIndex]);
          }
        } else if (showAddNew) {
          // Default to "Add new" if nothing is highlighted
          handleSelect(value.trim());
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="autocomplete-input"
      />
      {isOpen && (filteredOptions.length > 0 || showAddNew) && (
        <div ref={dropdownRef} className="autocomplete-dropdown">
          {showAddNew && (
            <div
              className={`autocomplete-option autocomplete-add-new ${
                0 === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSelect(value.trim())}
              onMouseEnter={() => setHighlightedIndex(0)}
            >
              <span className="add-new-icon">+</span>
              {newItemLabel}: "{value.trim()}"
            </div>
          )}
          {showAddNew && filteredOptions.length > 0 && (
            <div className="autocomplete-divider" />
          )}
          {filteredOptions.map((option, index) => {
            // Existing options are offset by 1 if "Add new" is shown
            const optionIndex = showAddNew ? index + 1 : index;
            return (
              <div
                key={`${option}-${index}`}
                className={`autocomplete-option ${
                  optionIndex === highlightedIndex ? 'highlighted' : ''
                }`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(optionIndex)}
              >
                {option}
              </div>
            );
          })}
        </div>
      )}
      {isOpen && value && filteredOptions.length === 0 && !showAddNew && (
        <div className="autocomplete-dropdown">
          <div className="autocomplete-no-results">
            No matching options found
          </div>
        </div>
      )}
    </div>
  );
}

