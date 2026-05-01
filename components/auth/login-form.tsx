'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout('');
    setBezig(true);

    const result = await signIn('credentials', {
      email,
      pincode,
      redirect: false,
    });

    setBezig(false);

    if (result?.error) {
      setFout('Onjuist e-mailadres of pincode.');
    } else {
      router.push('/kalender');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
          {fout}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="naam@nyenrode.nl"
        />
      </div>

      <div>
        <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
          Pincode
        </label>
        <input
          id="pincode"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="4-cijferige pincode"
        />
      </div>

      <button
        type="submit"
        disabled={bezig}
        className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {bezig ? 'Bezig...' : 'Inloggen'}
      </button>
    </form>
  );
}
