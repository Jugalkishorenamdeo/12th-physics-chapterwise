import fs from 'fs';
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const settingsBlockStart = '{/* Admin Settings Content */}';
const settingsBlockEnd = '{/* Add Question Modal */}';

const startIndex = content.indexOf(settingsBlockStart);
const endIndex = content.indexOf(settingsBlockEnd);

const newContent = content.substring(0, startIndex) + `{/* Admin Settings Content */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card p-8 space-y-8 shadow-sm">
                  <div>
                    <h4 className="font-black text-xl mb-4 flex items-center gap-2 tracking-tighter">
                      <Lock className="text-sky-600" size={20} /> Admin Credentials
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Admin User ID</p>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                          <input 
                            type="text" 
                            placeholder="Admin User ID"
                            value={settings.adminUsername || ''}
                            onChange={(e) => setSettings({...settings, adminUsername: e.target.value})}
                            className="input pl-12 h-14 font-bold border-zinc-100 bg-zinc-50/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Admin Password</p>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                          <input 
                            type="text" 
                            placeholder="Naya Admin Password"
                            value={settings.adminPassword || ''}
                            onChange={(e) => setSettings({...settings, adminPassword: e.target.value})}
                            className="input pl-12 h-14 font-bold border-zinc-100 bg-zinc-50/50"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 leading-relaxed">Login ke liye isi User ID avam Password ka prayog hoga.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Clock className="text-sky-600" size={20} /> Quiz Time (Minutes)
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Default quiz samay</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Minutes:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, quizTime: Math.max(1, settings.quizTime - 1)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.quizTime}</span>
                        <button onClick={() => setSettings({...settings, quizTime: settings.quizTime + 1})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Award className="text-sky-600" size={20} /> Certificate Message
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Default message on certificate</p>
                    <textarea 
                      value={settings.certificateMessage || ''}
                      onChange={(e) => setSettings({...settings, certificateMessage: e.target.value})}
                      placeholder="Certificate message..."
                      className="input h-24 py-4 text-sm font-bold bg-white"
                    />
                  </div>
                </div>
                
                <div className="card p-8 space-y-8 shadow-sm">
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <GraduationCap className="text-sky-600" size={20} /> Certificate Eligibility
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Minimum percentage required</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Threshold %:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, certificateMinPercentage: Math.max(1, settings.certificateMinPercentage - 5)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.certificateMinPercentage}%</span>
                        <button onClick={() => setSettings({...settings, certificateMinPercentage: Math.min(100, settings.certificateMinPercentage + 5)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Database className="text-sky-600" size={20} /> Per-Topic Limit
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Max attempts per level star</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Max Attempts:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, maxAttemptsPerLevel: Math.max(1, settings.maxAttemptsPerLevel - 1)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.maxAttemptsPerLevel}</span>
                        <button onClick={() => setSettings({...settings, maxAttemptsPerLevel: settings.maxAttemptsPerLevel + 1})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                   <h4 className="font-black text-xl mb-6 flex items-center gap-2 tracking-tighter">
                     <RotateCcw className="text-sky-600" size={20} /> Randomization Controls
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest text-zinc-600 mb-1">Random Questions</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Shuffles individual question order</p>
                        </div>
                        <input type="checkbox" checked={settings.randomizeQuestions} onChange={(e) => setSettings({...settings, randomizeQuestions: e.target.checked})} className="toggle toggle-lg" />
                      </div>
                      <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest text-zinc-600 mb-1">Random Options</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Shuffles answers inside questions</p>
                        </div>
                        <input type="checkbox" checked={settings.randomizeOptions} onChange={(e) => setSettings({...settings, randomizeOptions: e.target.checked})} className="toggle toggle-lg" />
                      </div>
                   </div>
                 </div>

                 <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                   <h4 className="font-black text-lg mb-4 flex items-center gap-2"><Eye className="text-sky-600" size={20} /> Access Control</h4>
                   <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                        <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Maintenance</p>
                        <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})} className="toggle" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                        <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Allow Exit</p>
                        <input type="checkbox" checked={settings.leaveQuizEnabled} onChange={(e) => setSettings({...settings, leaveQuizEnabled: e.target.checked})} className="toggle" />
                      </div>
                   </div>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2"><ShieldAlert className="text-sky-600" size={20} /> Access Securities</h4>
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                       <div>
                         <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Allow Remix</p>
                         <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Toggle to prevent app remixing</p>
                       </div>
                       <input type="checkbox" checked={settings.allowRemix} onChange={(e) => setSettings({...settings, allowRemix: e.target.checked})} className="toggle toggle-info" />
                     </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                 <button onClick={async () => { await localDb.saveSettings(settings); toast.success('Settings Saheja gaya! (Saved)'); }} className="btn btn-primary w-full py-8 flex items-center justify-center gap-3 text-2xl font-black uppercase tracking-tighter shadow-xl shadow-sky-100 rounded-[32px]">
                    <Save size={28} /> Save All Settings
                 </button>
              </div>
            </div>
          )}
          ` + content.substring(endIndex);

fs.writeFileSync('src/components/AdminDashboard.tsx', newContent);
