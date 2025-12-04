
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { StorageService } from '../services/storage';
import { FootballDataService } from '../services/footballdata';
import { SyncService } from '../services/sync-service';
import { Key, CheckCircle, XCircle, Trash2, Heart, Download, Upload, Save, AlertTriangle, RefreshCcw, Database, BrainCircuit, Shield, Clock, Table, Calendar, User, Check, X, Wallet, Loader2, Newspaper, Users } from 'lucide-react';

export const Settings: React.FC = () => {
  const [keys, setKeys] = useState({ oddsKey: '', geminiKey: '', footballKey: '', newsKey: '' });
  const [inputs, setInputs] = useState({ oddsKey: '', geminiKey: '', footballKey: '', newsKey: '' });
  const [favTeam, setFavTeam] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'success' | 'error'>('idle');

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string>('');

  // Bankroll State
  const [bankroll, setBankroll] = useState<number>(1000);
  const [kellyStrategy, setKellyStrategy] = useState<'aggressive' | 'moderate' | 'conservative'>('conservative');

  // Data Status State
  const [dataStats, setDataStats] = useState({
    standings: 0,
    matches: 0,
    scorers: 0,
    squads: 0,
    lastSync: 0
  });

  const refreshDataStats = () => {
    const data = StorageService.getFootballData();
    setDataStats({
      standings: data.standings ? data.standings.length : 0,
      matches: data.matches ? data.matches.length : 0,
      scorers: data.scorers ? data.scorers.length : 0,
      squads: data.squads ? data.squads.length : 0,
      lastSync: data.lastSync || 0
    });
  };

  useEffect(() => {
    const stored = StorageService.getKeys();
    const team = StorageService.getFavoriteTeam();
    const brSettings = StorageService.getBankrollSettings();

    setKeys({
      oddsKey: stored.oddsKey || '',
      geminiKey: stored.geminiKey || '',
      footballKey: stored.footballKey || '',
      newsKey: stored.newsKey || ''
    });
    setInputs({
      oddsKey: stored.oddsKey || '',
      geminiKey: stored.geminiKey || '',
      footballKey: stored.footballKey || '',
      newsKey: stored.newsKey || ''
    });
    setFavTeam(team);
    setBankroll(brSettings.amount);
    setKellyStrategy(brSettings.strategy);

    const backupDate = StorageService.getLastBackupDate();
    if (backupDate) {
      try {
        setLastBackupDate(new Date(backupDate).toLocaleString('it-IT'));
      } catch (e) {
        setLastBackupDate("-");
      }
    }

    refreshDataStats();
  }, []);

  const saveKeysToStorage = (newInputs: typeof inputs) => {
    StorageService.saveKeys(newInputs.oddsKey, newInputs.geminiKey, newInputs.footballKey, newInputs.newsKey);
    setKeys(newInputs);
  };

  const handleSaveKey = (keyType: 'odds' | 'gemini' | 'football' | 'news') => {
    saveKeysToStorage(inputs);
  };

  const handleClearKey = (keyType: 'odds' | 'gemini' | 'football' | 'news') => {
    const newInputs = { ...inputs, [keyType === 'odds' ? 'oddsKey' : keyType === 'gemini' ? 'geminiKey' : keyType === 'football' ? 'footballKey' : 'newsKey']: '' };
    setInputs(newInputs);
    saveKeysToStorage(newInputs);
  };

  const handleSaveTeam = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFavTeam(val);
    StorageService.saveFavoriteTeam(val);
  };

  const handleSaveBankroll = () => {
    StorageService.saveBankrollSettings(bankroll, kellyStrategy);
    alert("Impostazioni Bankroll salvate!");
  };

  // SYNC WITH FOOTBALL-DATA.ORG - SAFE MODE (SEQUENTIAL)
  const handleSyncFootballData = async () => {
    if (!keys.footballKey) {
      alert("Inserisci prima la Football Data API Key!");
      return;
    }

    setHistoryLoading(true);
    setHistoryStatus('idle');
    setSyncProgress('Avvio safe mode...');

    try {
      await SyncService.syncAll(keys.footballKey, (msg) => setSyncProgress(msg));

      setHistoryStatus('success');
      refreshDataStats();
    } catch (e) {
      console.error(e);
      setSyncProgress('Errore 429/API');
      setHistoryStatus('error');
    } finally {
      setHistoryLoading(false);
      setTimeout(() => setSyncProgress(''), 3000);
    }
  };

  const handleDownloadBackup = () => {
    const backupJSON = StorageService.createBackup();

    // Update UI immediately
    const backupDate = StorageService.getLastBackupDate();
    if (backupDate) setLastBackupDate(new Date(backupDate).toLocaleString('it-IT'));

    const blob = new Blob([backupJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redzone_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreStatus('restoring');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          // Introduce a small delay to render the 'Restoring' state first
          setTimeout(() => {
            const success = StorageService.restoreBackup(content);
            if (success) {
              setRestoreStatus('success');
              // FIX: Use root navigation instead of location.reload() to prevent 404/Moved errors on some hosts
              setTimeout(() => {
                window.location.href = '/';
              }, 1500);
            } else {
              setRestoreStatus('error');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }, 500);
        } catch (err) {
          console.error("Parse error", err);
          setRestoreStatus('error');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setRestoreStatus('error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const DataStatusBadge = ({ label, count, icon: Icon }: { label: string, count: number, icon: any }) => (
    <div className={`flex flex-col items-center justify-center p-3 rounded border ${count > 0 ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
      <Icon size={18} className="mb-1" />
      <span className="text-[10px] uppercase font-bold mb-0.5">{label}</span>
      <span className="text-xs font-mono font-bold">{count > 0 ? count : '-'}</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">

      {/* Full Screen Loading Overlay for Restore */}
      {restoreStatus === 'restoring' && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center animate-fade-in">
          <Loader2 size={64} className="text-redzone-600 animate-spin mb-4" />
          <h2 className="text-2xl font-black text-white">RIPRISTINO IN CORSO...</h2>
          <p className="text-neutral-400 mt-2">Non chiudere l'applicazione.</p>
        </div>
      )}

      {restoreStatus === 'success' && (
        <div className="fixed inset-0 z-[300] bg-green-900/90 flex flex-col items-center justify-center animate-fade-in">
          <CheckCircle size={64} className="text-white mb-4" />
          <h2 className="text-2xl font-black text-white">BACKUP RIPRISTINATO!</h2>
          <p className="text-white mt-2">Riavvio automatico in corso...</p>
        </div>
      )}

      <div className="bg-cardbg border border-neutral-800 p-6 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-redzone-600 to-transparent"></div>
        <h2 className="text-2xl font-bold mb-2 text-white">Configurazione API</h2>
        <p className="text-neutral-400 text-sm mb-6">Gestisci le tue chiavi e preferenze.</p>

        {/* ODDS API SECTION */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Key size={16} className="text-redzone-500" /> The Odds API
            </label>
            {keys.oddsKey ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs.oddsKey}
              onChange={(e) => setInputs({ ...inputs, oddsKey: e.target.value })}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-redzone-600 focus:outline-none text-sm"
              placeholder="Odds API Key..."
            />
            <Button onClick={() => handleSaveKey('odds')} className="py-1 px-3 text-xs">Salva</Button>
            {keys.oddsKey && (
              <button onClick={() => handleClearKey('odds')} className="bg-neutral-800 p-2 rounded hover:bg-red-900 text-neutral-400 hover:text-white"><Trash2 size={16} /></button>
            )}
          </div>
        </div>

        {/* GEMINI API SECTION */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <BrainCircuit className="text-blue-500 w-4 h-4" /> Gemini AI
            </label>
            {keys.geminiKey ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs.geminiKey}
              onChange={(e) => setInputs({ ...inputs, geminiKey: e.target.value })}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
              placeholder="Gemini API Key..."
            />
            <Button onClick={() => handleSaveKey('gemini')} className="py-1 px-3 text-xs bg-blue-600 hover:bg-blue-500">Salva</Button>
            {keys.geminiKey && (
              <button onClick={() => handleClearKey('gemini')} className="bg-neutral-800 p-2 rounded hover:bg-red-900 text-neutral-400 hover:text-white"><Trash2 size={16} /></button>
            )}
          </div>
        </div>

        {/* NEWS API SECTION */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Newspaper size={16} className="text-orange-500" /> News API
            </label>
            {keys.newsKey ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs.newsKey}
              onChange={(e) => setInputs({ ...inputs, newsKey: e.target.value })}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none text-sm"
              placeholder="News API Key..."
            />
            <Button onClick={() => handleSaveKey('news')} className="py-1 px-3 text-xs bg-orange-700 hover:bg-orange-600">Salva</Button>
            {keys.newsKey && (
              <button onClick={() => handleClearKey('news')} className="bg-neutral-800 p-2 rounded hover:bg-red-900 text-neutral-400 hover:text-white"><Trash2 size={16} /></button>
            )}
          </div>
          <a href="https://newsapi.org/" target="_blank" className="text-[10px] text-orange-500 underline ml-1">Ottieni Key Gratis</a>
        </div>

        {/* FOOTBALL DATA API SECTION */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Shield size={16} className="text-yellow-500" /> Football Data API
            </label>
            {keys.footballKey ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs.footballKey}
              onChange={(e) => setInputs({ ...inputs, footballKey: e.target.value })}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none text-sm"
              placeholder="Football Data Key..."
            />
            <Button onClick={() => handleSaveKey('football')} className="py-1 px-3 text-xs bg-yellow-700 hover:bg-yellow-600">Salva</Button>
            {keys.footballKey && (
              <button onClick={() => handleClearKey('football')} className="bg-neutral-800 p-2 rounded hover:bg-red-900 text-neutral-400 hover:text-white"><Trash2 size={16} /></button>
            )}
          </div>
          <p className="text-[10px] text-neutral-500">
            Serve per scaricare classifica, forma e precedenti stagionali.
            <a href="https://www.football-data.org/" target="_blank" className="text-yellow-500 underline ml-1">Ottieni Key</a>
          </p>
        </div>

        {/* BANKROLL & STRATEGY SECTION */}
        <div className="space-y-3 border-t border-neutral-800 pt-6">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet size={16} className="text-green-500" /> Bankroll Management
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase text-neutral-500">Totale (€)</label>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase text-neutral-500">Strategia Kelly</label>
              <select
                value={kellyStrategy}
                onChange={(e) => setKellyStrategy(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="conservative">Conservativa (1/4)</option>
                <option value="moderate">Moderata (1/2)</option>
                <option value="aggressive">Aggressiva (Full)</option>
              </select>
            </div>
          </div>
          <Button onClick={handleSaveBankroll} variant="secondary" className="w-full text-xs">
            SALVA BANKROLL
          </Button>
        </div>

        {/* ANTI-FAN FILTER SECTION */}
        <div className="space-y-3 border-t border-neutral-800 pt-6">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Heart size={16} className="text-pink-500" /> Filtro Anti-Tifo (Cynical Mode)
          </label>
          <input
            type="text"
            value={favTeam}
            onChange={handleSaveTeam}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-pink-500 focus:outline-none text-sm"
            placeholder="Inserisci la tua squadra..."
          />
        </div>
      </div>

      {/* FOOTBALL DATA SYNC SECTION */}
      <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database size={18} className="text-neutral-400" /> Dati Context (Storico)
            </h2>
            <p className="text-neutral-400 text-xs mt-1">
              Cache Locale per SA, PL, CL e La Liga.
            </p>
          </div>
          {dataStats.lastSync > 0 && (
            <div className="text-[10px] text-neutral-500 text-right">
              Sync: {new Date(dataStats.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <br />
              {new Date(dataStats.lastSync).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* DATA STATUS GRID */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <DataStatusBadge label="Classifica" count={dataStats.standings} icon={Table} />
          <DataStatusBadge label="Partite" count={dataStats.matches} icon={Calendar} />
          <DataStatusBadge label="Marcatori" count={dataStats.scorers} icon={User} />
          <DataStatusBadge label="Rose" count={dataStats.squads} icon={Users} />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSyncFootballData}
            isLoading={historyLoading}
            variant="secondary"
            className="text-xs flex-1"
            disabled={!keys.footballKey}
          >
            <RefreshCcw size={14} /> {historyLoading ? (syncProgress || 'AGGIORNAMENTO...') : 'SINCRONIZZA TUTTO'}
          </Button>

          {historyStatus === 'success' && <div className="text-green-500 text-xs flex items-center gap-1 font-bold"><CheckCircle size={16} /> Ok!</div>}
          {historyStatus === 'error' && <div className="text-red-500 text-xs flex items-center gap-1 font-bold"><AlertTriangle size={16} /> Err</div>}
        </div>
      </div>

      {/* DATA BACKUP SECTION */}
      <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
        <h2 className="text-lg font-bold mb-2 text-white flex items-center gap-2">
          <Save size={18} className="text-neutral-400" /> Backup (Zona Sicura)
        </h2>
        <p className="text-neutral-400 text-xs mb-4">
          Salva TUTTO (Chiavi, Scommesse, Analisi, Classifiche) in un file.
        </p>

        {lastBackupDate && (
          <div className="mb-4 p-2 bg-neutral-800/50 rounded border border-neutral-700 flex items-center gap-2 text-xs text-neutral-400">
            <Clock size={14} /> Ultimo Backup: <span className="text-white font-bold">{lastBackupDate}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleDownloadBackup} className="w-full text-xs bg-neutral-800 border border-neutral-700">
            <Download size={14} /> SCARICA
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs bg-neutral-800 border border-neutral-700"
            disabled={restoreStatus === 'restoring'}
          >
            <Upload size={14} /> RIPRISTINA
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleUploadBackup} />
        </div>

        {restoreStatus === 'error' && (
          <div className="mt-2 bg-red-900/20 border border-red-900/50 p-2 rounded text-red-500 text-xs text-center font-bold flex items-center justify-center gap-2">
            <AlertTriangle size={14} /> Errore nel file di backup!
          </div>
        )}
      </div>
    </div>
  );
};
