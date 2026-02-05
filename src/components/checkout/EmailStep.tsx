import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EmailStepProps {
    initialEmail: string;
    onContinue: (email: string, registerData?: { password: string }) => void;
    onLogin: () => void;
}

export default function EmailStep({ initialEmail, onContinue, onLogin }: EmailStepProps) {
    const [email, setEmail] = useState(initialEmail);
    const [createAccount, setCreateAccount] = useState(false);
    const [password, setPassword] = useState('');
    const [emailExists, setEmailExists] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkEmail = async () => {
            if (!email || !email.includes('@')) return;
            setCheckingEmail(true);
            const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
            if (data) {
                setEmailExists(true);
            } else {
                setEmailExists(false);
            }
            setCheckingEmail(false);
        };

        const timeout = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeout);
    }, [email]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validar que el email esté presente y sea válido
        if (!email || !email.trim()) {
            setError('El email es requerido para continuar con tu compra');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            setError('Por favor ingresa un email válido');
            return;
        }

        if (emailExists) {
            setError('Ya existe una cuenta con este email. Por favor inicia sesión.');
            return;
        }

        if (createAccount && password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        onContinue(email, createAccount ? { password } : undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border p-3 rounded focus:outline-none focus:ring-1 focus:ring-black ${emailExists ? 'border-orange-300 bg-orange-50' : 'border-gray-300'}`}
                    placeholder="tu@email.com"
                    required
                />
                {checkingEmail && <p className="text-xs text-gray-500 mt-1">Verificando...</p>}

                {emailExists && (
                    <div className="bg-orange-50 p-3 rounded mt-2 border border-orange-200">
                        <p className="text-sm text-orange-800 mb-2">
                            ¡Ya te conocemos! Este email está registrado.
                        </p>
                        <button
                            type="button"
                            onClick={onLogin}
                            className="text-sm font-bold underline text-orange-900"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                )}
            </div>

            {!emailExists && (
                <div className="border p-4 rounded bg-gray-50">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="createAccount"
                            checked={createAccount}
                            onChange={(e) => setCreateAccount(e.target.checked)}
                            className="mt-1 w-4 h-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                        <label htmlFor="createAccount" className="text-sm cursor-pointer select-none">
                            <span className="font-bold block">Crear una cuenta (Recomendado)</span>
                            <span className="text-gray-500 block">Sigue tus pedidos, guarda direcciones y compra más rápido la próxima vez.</span>
                        </label>
                    </div>

                    {createAccount && (
                        <div className="mt-4 pl-7">
                            <label className="block text-sm font-medium mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 p-2 rounded"
                                placeholder="Mínimo 8 caracteres"
                                minLength={8}
                                required={createAccount}
                            />
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={emailExists || checkingEmail || !email || !email.includes('@')}
            >
                {createAccount ? 'Crear Cuenta y Continuar' : 'Continuar como Invitado'}
            </button>
        </form>
    );
}
