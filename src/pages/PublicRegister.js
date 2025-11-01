import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';

function PublicRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // List of consumer email domains to block
  const consumerDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
  ];

  const validateEmail = (email) => {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }

    // Extract domain
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Check if it's a consumer domain
    if (consumerDomains.includes(domain)) {
      return { 
        valid: false, 
        message: 'Please use your professional work email. Consumer email domains (Gmail, Yahoo, etc.) are not accepted.' 
      };
    }

    return { valid: true };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.password || !formData.confirmPassword || !formData.companyName) {
      setError('All fields are required.');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setError(emailValidation.message);
      return;
    }

    // Password match check
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Password strength check
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
          role: 'admin',
          companyName: formData.companyName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Account created successfully! Please log in.' } 
        });
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Simple header */}
      <div style={styles.header}>
        <div 
          style={styles.logo} 
          onClick={() => navigate('/')}
        >
          SignalTrue
        </div>
        <button 
          onClick={() => navigate('/login')} 
          style={styles.loginLink}
        >
          Already have an account? Sign in
        </button>
      </div>

      <div style={styles.formContainer}>
        <div style={styles.formBox}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>
            Start your free trial today. No credit card required.
          </p>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              Account created successfully! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="John"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                placeholder="john.doe@company.com"
                required
              />
              <p style={styles.hint}>
                Please use your professional work email (not Gmail, Yahoo, etc.)
              </p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                style={styles.input}
                placeholder="Acme Corp"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={styles.input}
                placeholder="Re-enter password"
                required
              />
            </div>

            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={success}
            >
              {success ? 'Success!' : 'Create Account'}
            </button>

            <p style={styles.terms}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    cursor: 'pointer',
  },
  loginLink: {
    color: 'white',
    background: 'transparent',
    border: '2px solid white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  formContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  formBox: {
    background: 'white',
    borderRadius: '12px',
    padding: '3rem',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#991b1b',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  successBox: {
    background: '#d1fae5',
    border: '1px solid #10b981',
    color: '#065f46',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  submitButton: {
    padding: '0.875rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  terms: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
};

export default PublicRegister;
