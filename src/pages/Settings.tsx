import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  User,
  Save,
  CheckCircle2,
  Lock,
  HelpCircle,
  Mail,
  Camera,
  Upload,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  Settings2,
  CreditCard,
  DollarSign,
  Check,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Bell,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { usePricingModal } from '../contexts/PricingModalContext';
import { Calendar } from 'lucide-react';

type SettingsTab = 'cuenta' | 'marketing';

const SettingsPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Freemium details
  const { planType, isPro, daysLeft, daysActive, expirationDate: hookExpirationDate } = useFreemiumLimiter();
  const { openPricingModal } = usePricingModal();

  // Marketing Mode
  const {
    isMarketingMode,
    overrides,
    setFakeProfit,
    setFakeWins,
    setFakeLosses,
    setFakeWinRate,
    setFakeBalance,
    toggleFakeNotifications,
    setCurrencyDisplay,
    toggleForceRealAccount,
    resetOverrides
  } = useMarketingMode();

  // Active tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('cuenta');

  // Profile Data
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Settings saved state (for visual feedback)
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<boolean>(false);
  const [isChangingEmail, setIsChangingEmail] = useState<boolean>(false);

  // 1. Carregamento Inicial
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        setIsLoading(true);
        console.log('Loading profile for user:', user.id);

        // Populate email from Auth User
        setEmail(user.email || '');

        // Fetch from Public Profiles Table
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, expiration_date')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{ id: user.id, email: user.email }]);

            if (insertError) {
              console.error('Error creating profile:', insertError);
            }
          }
        } else if (data) {
          setFullName(data.full_name || '');
          setAvatarUrl(data.avatar_url);
          // Format expiration date if exists
          if (data.expiration_date) {
            const date = new Date(data.expiration_date);
            setExpirationDate(date.toLocaleDateString('pt-BR'));
          }
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // 2. Upload de Foto (Avatar)
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    if (!user) return;

    try {
      setIsUploading(true);
      const file = event.target.files[0];

      // Validar tamanho do arquivo (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo excede el tamaño máximo permitido de 5MB.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${user.id}/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      toast.success('Foto de perfil atualizada!');

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(`Erro ao atualizar foto: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
      // Clean up input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 3. Salvar Nome (Perfil)
  const saveProfile = async () => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setSettingsSaved(true);
      toast.success('Perfil atualizado com sucesso!');

      setTimeout(() => setSettingsSaved(false), 3000);

    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(`Erro ao salvar perfil: ${error.message || 'Verifique o console'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Alterar E-mail
  const handleEmailChange = async () => {
    if (!user) return;
    if (!newEmail) return;

    // Simple validation
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      toast.error('Por favor, insira um e-mail válido.');
      return;
    }

    try {
      setIsChangingEmail(true);

      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setEmailChangeSuccess(true);
      setNewEmail(''); // Clear input
      toast.success('Verifique seu novo e-mail para confirmar a alteração.');

      setTimeout(() => setEmailChangeSuccess(false), 3000);

    } catch (error: any) {
      console.error('Error changing email:', error);
      toast.error(`Erro ao alterar e-mail: ${error.message}`);
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Alterar Senha
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError('');

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');

      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => setPasswordSuccess(false), 3000);

    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(`Erro: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'cuenta':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* User Profile Section */}
            <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
              <div className="p-5 border-b bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="text-primary" size={18} />
                  <h2 className="text-lg font-semibold">Perfil de Usuario</h2>
                </div>
                <div className={cn(
                  "text-xs px-3 py-1 rounded-full border mb-0",
                  isPro ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                )}>
                  {isPro ? 'Plan Pro' : 'Plan Gratuito'}
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  {/* Profile picture section */}
                  <div className="w-full md:w-auto flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="h-32 w-32 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center text-primary overflow-hidden shadow-inner">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={64} className="opacity-50" />
                        )}

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" size={24} />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={triggerFileInput}
                        disabled={isUploading}
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                      />
                    </div>
                    <button
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium"
                    >
                      <Upload size={14} />
                      {isUploading ? 'Subiendo...' : 'Cambiar foto'}
                    </button>
                  </div>

                  {/* User info fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium">
                        Nombre completo
                      </label>
                      <div className="relative">
                        <input
                          id="name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full p-2.5 bg-background border border-border rounded-md shadow-sm focus:border-primary focus:ring-1 focus:ring-primary pl-9 transition-all"
                        />
                        <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <input
                          id="email"
                          type="email"
                          value={email}
                          readOnly
                          className="w-full p-2.5 bg-muted/50 border border-border rounded-md shadow-sm pl-9 text-muted-foreground cursor-not-allowed"
                        />
                        <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Para cambiar tu correo, usa la sección "Cambiar Correo" más abajo
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="expiresAt" className="block text-sm font-medium">
                        Fecha de Expiración
                      </label>
                      <div className="relative">
                        <input
                          id="expiresAt"
                          type="text"
                          value={expirationDate || 'Vitalício / Indefinido'}
                          readOnly
                          className="w-full p-2.5 bg-muted/50 border border-border rounded-md shadow-sm pl-9 text-muted-foreground cursor-not-allowed"
                        />
                        <Clock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/10 border-t flex justify-end items-center">
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {isSaving ? 'Guardando...' : 'Guardar perfil'}
                </button>
              </div>
            </div>

            <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
              <div className="p-5 border-b bg-muted/40 flex items-center gap-2">
                <Calendar className="text-primary" size={18} />
                <h2 className="text-lg font-semibold">Estado del Plan</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Box */}
                  <div className={cn(
                    "rounded-xl p-5 border",
                    isPro
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-blue-500/5 border-blue-500/20"
                  )}>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Plan Actual
                    </h3>
                    <div className="flex items-center gap-3">
                      {isPro ? (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Lock className="text-amber-500" size={20} />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-amber-500">PRO</div>
                            <p className="text-xs text-amber-500/60 font-medium">Acceso Total</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <User className="text-blue-500" size={20} />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-500">FREE</div>
                            <p className="text-xs text-blue-500/60 font-medium">Acceso Limitado</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time Box */}
                  <div className="rounded-xl p-5 border bg-secondary/5 border-border">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {isPro ? 'Tiempo Restante' : 'Tiempo Activo'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="text-primary" size={20} />
                      </div>
                      <div>
                        {isPro ? (
                          <>
                            <div className="text-2xl font-bold text-foreground">
                              {daysLeft !== null ? daysLeft : '∞'} <span className="text-sm font-normal text-muted-foreground">días</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Vence: {hookExpirationDate ? new Date(hookExpirationDate).toLocaleDateString() : 'Nunca'}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-foreground">
                              {daysActive} <span className="text-sm font-normal text-muted-foreground">días</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Usando versión gratuita
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {!isPro && (
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-amber-500 text-sm">¿Quieres eliminar los límites?</h4>
                      <p className="text-xs text-amber-600/80 mt-1">
                        Actualiza a PRO para operar sin límites de ganancia y con stake libre.
                      </p>
                    </div>
                    <button
                      onClick={openPricingModal}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold rounded shadow-lg hover:shadow-amber-500/25 active:scale-95 transition-all"
                    >
                      ACTUALIZAR AHORA
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
              <div className="p-5 border-b bg-muted/40 flex items-center gap-2">
                <Mail className="text-primary" size={18} />
                <h2 className="text-lg font-semibold">Cambiar Correo</h2>
              </div>

              <div className="p-6">
                <div className="max-w-md">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Correo actual</label>
                      <div className="px-3 py-2 border border-border rounded-md bg-muted/20">
                        <span className="text-sm font-mono text-muted-foreground">{email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="new-email" className="block text-sm font-medium">
                        Nuevo Correo
                      </label>
                      <div className="relative">
                        <input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="tu-nuevo-correo@ejemplo.com"
                          className="w-full p-2.5 bg-background border border-border rounded-md shadow-sm focus:border-primary focus:ring-1 focus:ring-primary pl-9 transition-all"
                        />
                        <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recibirás un enlace de confirmación en el nuevo correo.
                      </p>
                    </div>

                    {emailChangeSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <p>¡Solicitud enviada! Verifique su nuevo email.</p>
                      </div>
                    )}

                    <button
                      onClick={handleEmailChange}
                      disabled={!newEmail || newEmail === email || isChangingEmail}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isChangingEmail && <Loader2 size={14} className="animate-spin" />}
                      Solicitar cambio de correo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
              <div className="p-5 border-b bg-muted/40 flex items-center gap-2">
                <Lock className="text-primary" size={18} />
                <h2 className="text-lg font-semibold">Cambiar Contraseña</h2>
              </div>

              <div className="p-6">
                <div className="max-w-md">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="block text-sm font-medium">
                        Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-2.5 bg-background border border-border rounded-md shadow-sm focus:border-primary focus:ring-1 focus:ring-primary pl-9 transition-all"
                        />
                        <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mínimo 6 caracteres.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="block text-sm font-medium">
                        Confirmar Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-2.5 bg-background border border-border rounded-md shadow-sm focus:border-primary focus:ring-1 focus:ring-primary pl-9 transition-all"
                        />
                        <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                      </div>
                    </div>

                    {passwordError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        <p>{passwordError}</p>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <p>¡Contraseña cambiada con éxito!</p>
                      </div>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      disabled={!newPassword || !confirmPassword || isChangingPassword}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isChangingPassword && <Loader2 size={14} className="animate-spin" />}
                      Cambiar contraseña
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'marketing':
        if (!isMarketingMode) return null;
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border rounded-xl shadow-sm overflow-hidden bg-card border-purple-500/20">
              <div className="p-5 border-b bg-purple-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg">
                    <Sparkles className="text-white" size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Modo Marketing</h2>
                    <p className="text-xs text-purple-500 font-medium">CENTRO DE CONTROL DEMO</p>
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono">
                  SOLO MARKETING
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Account Type Control */}
                <div>
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <CreditCard size={16} className="text-primary" />
                    Tipo de Cuenta
                  </h3>
                  <div className="p-4 bg-muted/30 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium block">Demo → Real</span>
                      <span className="text-xs text-muted-foreground">Siempre mostrar como Cuenta Real (incluso en Demo)</span>
                    </div>
                    <button
                      onClick={toggleForceRealAccount}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                        overrides.forceRealAccount ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                        overrides.forceRealAccount ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                {/* Currency Control */}
                <div>
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-primary" />
                    Moneda Visual
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCurrencyDisplay('USD')}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:bg-muted/50",
                        overrides.currencyDisplay === 'USD'
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600"
                          : "bg-card hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl font-bold">$ USD</span>
                      {overrides.currencyDisplay === 'USD' && <Check size={16} />}
                    </button>
                    <button
                      onClick={() => setCurrencyDisplay('USDT')}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:bg-muted/50",
                        overrides.currencyDisplay === 'USDT'
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-600"
                          : "bg-card hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl font-bold">USDT</span>
                      {overrides.currencyDisplay === 'USDT' && <Check size={16} />}
                    </button>
                  </div>
                </div>

                {/* Stats Control */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Settings2 size={16} className="text-primary" />
                      Estadísticas Fake
                    </h3>
                    <button
                      onClick={resetOverrides}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={12} />
                      Resetear valores
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <DollarSign size={12} /> Lucro Total
                      </label>
                      <input
                        type="number"
                        value={overrides.fakeProfit}
                        onChange={(e) => setFakeProfit(parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border rounded-md p-2 font-mono text-emerald-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Wallet size={12} /> Balance
                      </label>
                      <input
                        type="number"
                        value={overrides.fakeBalance}
                        onChange={(e) => setFakeBalance(parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border rounded-md p-2 font-mono text-cyan-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingUp size={12} /> Wins
                      </label>
                      <input
                        type="number"
                        value={overrides.fakeWins}
                        onChange={(e) => setFakeWins(parseInt(e.target.value) || 0)}
                        className="w-full bg-background border rounded-md p-2 font-mono text-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingDown size={12} /> Losses
                      </label>
                      <input
                        type="number"
                        value={overrides.fakeLosses}
                        onChange={(e) => setFakeLosses(parseInt(e.target.value) || 0)}
                        className="w-full bg-background border rounded-md p-2 font-mono text-rose-500"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Percent size={12} /> Win Rate (%)
                      </label>
                      <input
                        type="number"
                        value={overrides.fakeWinRate}
                        onChange={(e) => setFakeWinRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border rounded-md p-2 font-mono text-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications Toggle */}
                <div className="p-4 bg-muted/30 rounded-lg border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Bell size={16} className="text-purple-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium block">Notificaciones Fake</span>
                      <span className="text-xs text-muted-foreground">Simular notificaciones de ganancia</span>
                    </div>
                  </div>
                  <button
                    onClick={toggleFakeNotifications}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                      overrides.showFakeNotifications ? "bg-purple-500" : "bg-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      overrides.showFakeNotifications ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>

              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-20 px-4 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto pt-20 pb-8 px-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="text-primary" size={28} />
              Configuración
            </h1>
            <p className="text-muted-foreground">Personaliza tu experiencia en Million Bots</p>
          </div>

          {settingsSaved && (
            <div className="mt-4 md:mt-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
              <CheckCircle2 size={18} />
              <span className="font-medium">¡Cambios guardados!</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar navigation */}
        <div className="md:col-span-1 space-y-6">
          <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
            <div className="p-4 border-b bg-muted/40">
              <h2 className="text-lg font-semibold">Categorías</h2>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => setActiveTab('cuenta')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-md transition-all duration-200",
                  activeTab === 'cuenta'
                    ? "bg-primary/10 text-primary font-medium translate-x-1"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <User size={18} />
                <span>Perfil</span>
              </button>
            </div>
          </div>

          {/* User profile summary */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center text-primary mb-3 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="opacity-50" />
                )}
              </div>
              <h3 className="font-medium truncate max-w-full px-2">{fullName || email}</h3>
              <p className="text-sm text-muted-foreground truncate max-w-full px-2">{email}</p>
              <div className={cn(
                "mt-2 inline-flex items-center text-xs px-2 py-1 rounded-full border",
                isPro
                  ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                  : "text-blue-500 bg-blue-500/10 border-blue-500/20"
              )}>
                {isPro ? 'Plan Pro' : 'Plan Gratuito'}
              </div>
            </div>
          </div>

          {/* Quick help */}
          <div className="border rounded-xl p-4 bg-muted/20">
            <div className="flex items-start gap-3">
              <HelpCircle className="text-primary mt-0.5" size={18} />
              <div>
                <h3 className="font-medium mb-1">Ayuda y Soporte</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  ¿Necesitas ayuda con tu configuración? Contacta al soporte.
                </p>
                <button className="text-sm text-primary hover:underline font-medium">
                  Contáctanos
                </button>
              </div>
            </div>
          </div>

          {isMarketingMode && (
            <div className="mt-6 border border-purple-500/30 rounded-xl overflow-hidden bg-card shadow-lg shadow-purple-500/5">
              <div className="p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
                <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                  <Sparkles size={18} />
                  Marketing
                </h2>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => setActiveTab('marketing')}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-md transition-all duration-200",
                    activeTab === 'marketing'
                      ? "bg-purple-500/10 text-purple-500 font-medium translate-x-1 border border-purple-500/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings2 size={18} />
                  <span>Configuración Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
        <div>
          <p>© 2026 Million Bots. Todos los derechos reservados.</p>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Términos</a>
          <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
          <a href="#" className="hover:text-primary transition-colors">Contacto</a>
        </div>
      </div>
    </div >
  );
};

export default SettingsPage;
