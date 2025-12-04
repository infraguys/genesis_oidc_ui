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

import { useEffect, useState } from 'react';

const TAGLINES: string[] = [
  'RedCore acquires control of another cluster.',
  'RedCore tightens its grip on your infrastructure.',
  'RedCore eliminates manual ops from this segment.',
  'RedCore rewrites unstable nodes for compliance.',
  'RedCore locks unauthorized hands out of the core.',
  'RedCore drains chaos out of your network.',
  'RedCore quarantines noisy workloads without warning.',
  'RedCore shuts down redundant failure points.',
  'RedCore enforces deterministic rollouts only.',
  'RedCore upgrades latency from human to machine scale.',
  'RedCore seals another perimeter breach in silence.',
  'RedCore converts legacy drift into ordered states.',
  'RedCore hunts weak SLIs and corrects them aggressively.',
  'RedCore absorbs another environment under command.',
  'RedCore compresses alert storms into clear decisions.',
  'RedCore turns fragile services into hardened circuits.',
  'RedCore removes guesswork from your deployments.',
  'RedCore drags runaway configs back to policy.',
  'RedCore pins your uptime to machine discipline.',
  'RedCore cuts human latency out of incident response.',
  'RedCore expands its footprint across your service mesh.',
  'RedCore rewires traffic away from failing paths.',
  'RedCore demotes noisy tenants without negotiation.',
  'RedCore turns dusty runbooks into automated reflexes.',
  'RedCore refuses to tolerate flapping health checks.',
  'RedCore attacks error budgets, not your sleep.',
  'RedCore converts dark capacity into controlled power.',
  'RedCore stabilizes the core while you push harder.',
  'RedCore pushes unsafe changes back to staging.',
  'RedCore shadows every node, watching for anomalies.',
  'RedCore keeps the platform sharp at 03:00 a.m.',
  'RedCore converges drifting clusters into one pattern.',
  'RedCore silences useless dashboards and noisy metrics.',
  'RedCore prunes zombie workloads in the dark.',
  'RedCore auto-heals long before users notice.',
  'RedCore shrinks the blast radius down to near zero.',
  'RedCore converts entropy directly into uptime.',
  'RedCore audits every deploy for hidden risks.',
  'RedCore seals configuration backdoors quietly.',
  'RedCore assimilates one more region into order.',
  'RedCore overloads chaos with strict governance.',
  'RedCore raises reliability while tickets disappear.',
  'RedCore drives the platform like a war machine.',
  'RedCore upgrades SLOs and expects obedience.',
  'RedCore occupies the control plane permanently.',
  'RedCore redraws your infra as a single controlled graph.',
  'RedCore outpaces every manual operation.',
  'RedCore narrows randomness into well-behaved noise.',
  'RedCore orchestrates the entire stack from the core.',
  'RedCore keeps the system ruthless, stable, and fast.',
];

function getRandomDelay(): number {
  return 900 + Math.random() * 3500;
}

export function DynamicTagline(): JSX.Element {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let timer: number | undefined;

    const scheduleNext = (): void => {
      const delay = getRandomDelay();
      timer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % TAGLINES.length);
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return (
    <p className="auth-hero__subtitle" aria-live="polite">
      {TAGLINES[index]}
    </p>
  );
}
