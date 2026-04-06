import { useState } from 'react';

const PROVIDERS = {
  anthropic: { name: 'Anthropic', placeholder: 'sk-ant-...', link: 'https://console.anthropic.com' },
  gemini: { name: 'Google Gemini', placeholder: 'AIzaSy...', link: 'https://aistudio.google.com/app/apikey' },
  openai: { name: 'OpenAI', placeholder: 'sk-...', link: 'https://platform.openai.com/api-keys' },
  mistral: { name: 'Mistral', placeholder: '...', link: 'https://console.mistral.ai/api-keys/' },
  nvidia: { name: 'NVIDIA', placeholder: 'nvapi-...', link: 'https://build.nvidia.com/explore/discover' }
};

export default function SettingsModal({ apiConfig, setApiConfig, onClose }) {
  const [tempProvider, setTempProvider] = useState(apiConfig.provider);
  const [tempKeys, setTempKeys] = useState({ ...apiConfig.keys });

  const activeInfo = PROVIDERS[tempProvider];

  const handleSave = () => {
    setApiConfig({ provider: tempProvider, keys: tempKeys });
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Clausr Settings</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <p className="settings-subtitle">AI Provider Configuration</p>
          
          <label className="settings-label">Select Provider</label>
          <select 
            className="settings-input" 
            style={{ marginBottom: '16px', appearance: 'menulist' }}
            value={tempProvider}
            onChange={e => setTempProvider(e.target.value)}
          >
            {Object.entries(PROVIDERS).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>

          <label className="settings-label">{activeInfo.name} API Key</label>
          <input
            type="password"
            className="settings-input"
            placeholder={activeInfo.placeholder}
            value={tempKeys[tempProvider]}
            onChange={e => setTempKeys(prev => ({ ...prev, [tempProvider]: e.target.value }))}
          />
          <p className="settings-hint">
            Your key is used only in this browser session and never stored.
            <br />
            <a href={activeInfo.link} target="_blank" rel="noreferrer"
              style={{ color: 'var(--purple)', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
              Get an API key →
            </a>
          </p>
        </div>
        <div className="settings-footer">
          <button className="btn-save" onClick={handleSave}>
            Save
          </button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
