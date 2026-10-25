"use client";

import { Icon } from "./icon";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}

export function SearchField({
  value,
  onChange,
  placeholder = "ابحث بالاسم، الهاتف، أو العنوان",
  label = "بحث عن عميل",
  autoFocus = false,
}: SearchFieldProps) {
  return (
    <div className="search-field">
      <span aria-hidden="true" className="search-field__icon">
        <Icon name="search" size={19} />
      </span>
      <input
        aria-label={label}
        autoComplete="off"
        autoFocus={autoFocus}
        className="input search-field__input"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="مسح البحث"
          className="search-field__clear"
          onClick={() => onChange("")}
          type="button"
        >
          <Icon name="close" size={16} />
        </button>
      ) : null}
    </div>
  );
}
