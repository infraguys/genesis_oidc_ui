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

import './PrimaryButton.css';

import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  type = 'button',
  onClick,
  fullWidth,
}: PrimaryButtonProps): JSX.Element {
  const className = fullWidth ? 'primary-button primary-button--full' : 'primary-button';

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
