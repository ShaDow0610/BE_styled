"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
      <h2 className="font-serif text-2xl text-ink mb-6">Connexion</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink disabled:bg-ivory-soft"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink disabled:bg-ivory-soft"
            required
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="w-full bg-ink text-ivory py-2 rounded-lg font-medium hover:bg-ink-soft transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <FontAwesomeIcon
                icon={faSpinner}
                className="w-4 h-4 animate-spin"
              />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default LoginForm;
