/*
 * Copyright 2025 Genesis Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './TextInput.css';

import type { ReactNode } from 'react';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  autoComplete?: string;
  icon?: ReactNode;
}

export function TextInput({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  name,
  autoComplete,
  icon,
}: TextInputProps): JSX.Element {
  return (
    <label className="text-input" data-allow-context-menu="true">
      {label && <span className="text-input__label">{label}</span>}
      <div className="text-input__field">
        <input
          type={type}
          name={name}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="text-input__control"
        />
        {icon && <span className="text-input__icon">{icon}</span>}
      </div>
    </label>
  );
}
