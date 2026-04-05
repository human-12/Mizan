import React, { useState, useEffect } from 'react';
import { analyzeAsset, extractBlockchainFacts } from '../lib/gemini';
import { db, auth, signInWithGoogle, logOut } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Markdown from 'react-markdown';
import { Search, Loader2, CheckCircle, LogOut, LogIn, Scale, Terminal, ScrollText, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ScholarDashboard() {
  const [user, setUser] = useState<any>(null);
  const [assetQuery, setAssetQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [factSheet, setFactSheet] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [scholarNotes, setScholarNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedFatwas, setSavedFatwas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'fatwas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fatwasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedFatwas(fatwasData);
    }, (err) => {
      console.error("Error fetching fatwas:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetQuery.trim()) return;

    setIsAnalyzing(true);
    setAnalysisStatus('Extracting On-Chain Facts...');
    setError(null);
    setAnalysisResult(null);
    setFactSheet(null);

    try {
      const facts = await extractBlockchainFacts(assetQuery);
      setFactSheet(facts);
      
      setAnalysisStatus('Consulting Usūl al-Fiqh Panel...');
      const result = await analyzeAsset(assetQuery, facts);
      setAnalysisResult(result);
      setScholarNotes(result.dalilNarrative); // Pre-fill notes with the narrative for editing
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !analysisResult) return;
    
    setIsSaving(true);
    setError(null);

    try {
      await addDoc(collection(db, 'fatwas'), {
        asset: assetQuery,
        ruling: analysisResult.ruling,
        rulingStrength: analysisResult.rulingStrength,
        rulingScore: analysisResult.rulingScore,
        illahIdentified: analysisResult.illahIdentified,
        tahqiqAlManat: analysisResult.tahqiqAlManat,
        dalilNarrative: analysisResult.dalilNarrative,
        dalilStack: analysisResult.dalilStack,
        aaoifi_evidence: analysisResult.aaoifi_evidence || [],
        contraryView: analysisResult.contraryView,
        riskMetrics: analysisResult.riskMetrics || null,
        areasNeedingReview: analysisResult.areasNeedingReview || [],
        knowledge_graph: analysisResult.knowledge_graph || null,
        xai_explanations: analysisResult.xai_explanations || [],
        date_approved: new Date().toISOString(),
        scholar_notes: scholarNotes,
        scholarId: user.uid
      });
      
      setAnalysisResult(null);
      setAssetQuery('');
      setScholarNotes('');
      alert("Fatwa approved and saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save fatwa.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,95,70,0.15)_0%,transparent_60%)] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-md w-full glass-panel rounded-sm p-10 text-center relative z-10"
        >
          <div className="w-20 h-20 border border-[#d4af37] bg-black/50 text-[#d4af37] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
            <Scale className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold mb-3 font-serif gold-gradient-text tracking-wide uppercase">Mizan SSL</h1>
          <p className="text-[#94a3b8] mb-10 font-serif italic text-lg">Shariah Safety Layer • Scholar Portal</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-[#d4af37] hover:bg-[#bf953f] text-black py-3 px-4 rounded-sm transition-all font-bold tracking-widest uppercase text-sm"
          >
            <LogIn className="w-5 h-5" />
            Authenticate Scholar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-[#d4af37] selection:text-black pb-20">
      <header className="glass-panel sticky top-0 z-50 border-b border-[#d4af37]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-[#d4af37] bg-black/50 text-[#d4af37] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Scale className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif gold-gradient-text tracking-widest uppercase">Mizan SSL</h1>
              <p className="text-xs text-[#94a3b8] font-mono tracking-widest uppercase">Ijtihād Engine v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-[#d4af37] hidden sm:block font-serif italic">
              Scholar: <span className="font-bold not-italic text-white">{user.displayName}</span>
            </div>
            <button 
              onClick={logOut}
              className="p-2 text-[#94a3b8] hover:text-[#d4af37] hover:bg-black/30 rounded-full transition-colors border border-transparent hover:border-[#d4af37]/30"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-sm p-8 mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-[#d4af37]" />
          <h2 className="text-2xl font-serif mb-6 flex items-center gap-3 text-white">
            <Search className="w-6 h-6 text-[#d4af37]" />
            Initiate Asset Analysis
          </h2>
          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              placeholder="Enter token name or contract address (e.g., 0xABC...)"
              className="flex-1 bg-black/50 border border-[#d4af37]/30 rounded-sm px-5 py-4 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-mono text-lg text-[#d4af37] placeholder:text-[#94a3b8]/50"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={isAnalyzing || !assetQuery.trim()}
              className="bg-[#d4af37] hover:bg-[#bf953f] disabled:bg-[#d4af37]/20 disabled:text-[#d4af37]/50 text-black px-8 py-4 rounded-sm font-bold tracking-widest uppercase transition-all flex items-center gap-3 min-w-[200px] justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {analysisStatus}
                </>
              ) : (
                'Commence Ijtihād'
              )}
            </button>
          </form>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-red-950/50 text-red-400 rounded-sm border border-red-900/50 font-mono text-sm">
              [ERROR]: {error}
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {(factSheet || analysisResult) && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.6, staggerChildren: 0.2 }}
              className="space-y-8 mb-16"
            >
              {/* Fact Sheet Terminal */}
              {factSheet && (
                <motion.div className="glass-panel rounded-sm border border-[#3b82f6]/50 overflow-hidden">
                  <div className="bg-[#020617] border-b border-[#3b82f6]/50 p-3 flex items-center justify-between">
                    <h3 className="font-mono text-sm flex items-center gap-2 text-[#60a5fa]">
                      <Terminal className="w-4 h-4" />
                      Blockchain Forensics: Tahqīq al-Manāt
                    </h3>
                  </div>
                  <div className="p-6 bg-[#020617]/80 font-mono text-sm text-[#93c5fd] space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-[#60a5fa] font-bold mb-2 border-b border-[#3b82f6]/30 pb-1">Token Mechanics</h4>
                        <div className="mb-2">
                          <span className="text-[#60a5fa] font-bold">Token Type:</span> {factSheet.token_type}
                        </div>
                        <div className="mb-2">
                          <span className="text-[#60a5fa] font-bold">Minting Model:</span> {factSheet.minting_model}
                        </div>
                        <div className="mb-2">
                          <span className="text-[#60a5fa] font-bold">Revenue Source:</span> {factSheet.revenue_source}
                        </div>
                        <div className="mb-2">
                          <span className="text-[#60a5fa] font-bold">Yield Source:</span> {factSheet.yield_source}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[#60a5fa] font-bold mb-2 border-b border-[#3b82f6]/30 pb-1">Shariah Risk Flags</h4>
                        <ul className="space-y-2">
                          <li className="flex items-center justify-between">
                            <span>Ribā Pattern:</span>
                            <span className={factSheet.riba_pattern ? "text-red-400 font-bold" : "text-emerald-400"}>{factSheet.riba_pattern ? "DETECTED" : "CLEAR"}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Gharar Pattern:</span>
                            <span className={factSheet.gharar_pattern ? "text-red-400 font-bold" : "text-emerald-400"}>{factSheet.gharar_pattern ? "DETECTED" : "CLEAR"}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Maysir Pattern:</span>
                            <span className={factSheet.maysir_pattern ? "text-red-400 font-bold" : "text-emerald-400"}>{factSheet.maysir_pattern ? "DETECTED" : "CLEAR"}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Ownership Risk:</span>
                            <span className={factSheet.ownership_risk ? "text-amber-400 font-bold" : "text-emerald-400"}>{factSheet.ownership_risk ? "DETECTED" : "CLEAR"}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Currency Classification Risk:</span>
                            <span className={factSheet.currency_classification_risk ? "text-amber-400 font-bold" : "text-emerald-400"}>{factSheet.currency_classification_risk ? "DETECTED" : "CLEAR"}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-[#60a5fa] font-bold mb-2 border-b border-[#3b82f6]/30 pb-1">Jurisdiction & ‘Urf Awareness</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {['Pakistan', 'GCC', 'Malaysia', 'UK'].map(region => (
                            <div key={region} className="bg-[#020617] p-3 rounded-sm border border-[#3b82f6]/20">
                              <h5 className="text-[#93c5fd] font-bold mb-1">{region}</h5>
                              <ul className="space-y-1 text-xs">
                                <li><span className="text-[#60a5fa]">Class:</span> {factSheet.jurisdiction_view?.[region]?.legal_classification}</li>
                                <li><span className="text-[#60a5fa]">Staking:</span> {factSheet.jurisdiction_view?.[region]?.staking_view}</li>
                                <li><span className="text-[#60a5fa]">Risk:</span> {factSheet.jurisdiction_view?.[region]?.regulatory_risk}</li>
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[#60a5fa] font-bold mb-2 border-b border-[#3b82f6]/30 pb-1">Whitepaper vs Reality Audit</h4>
                        <div className="bg-[#020617] p-4 rounded-sm border border-[#3b82f6]/20 space-y-3 h-full">
                          <div className="flex items-center justify-between border-b border-[#3b82f6]/20 pb-2">
                            <span className="font-bold">Deception Risk:</span>
                            <span className={factSheet.whitepaper_audit?.deception_risk ? "text-red-400 font-bold" : "text-emerald-400"}>
                              {factSheet.whitepaper_audit?.deception_risk ? "DETECTED" : "CLEAR"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#60a5fa] font-bold text-xs uppercase block mb-1">Mismatches Detected:</span>
                            {factSheet.whitepaper_audit?.mismatches_detected?.length > 0 ? (
                              <ul className="list-disc list-inside text-xs space-y-1 text-amber-400">
                                {factSheet.whitepaper_audit.mismatches_detected.map((m: string, i: number) => <li key={i}>{m}</li>)}
                              </ul>
                            ) : (
                              <span className="text-xs text-emerald-400">None detected</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[#60a5fa] font-bold text-xs uppercase block mb-1">On-Chain Findings:</span>
                            <ul className="list-disc list-inside text-xs space-y-1">
                              {factSheet.whitepaper_audit?.onchain_findings?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {analysisResult && (
                <>
                  {/* Internal Debate Terminal */}
                  <motion.div className="glass-panel rounded-sm border border-[#065f46]/50 overflow-hidden">
                    <div className="bg-[#020403] border-b border-[#065f46]/50 p-3 flex items-center justify-between">
                      <h3 className="font-mono text-sm flex items-center gap-2 text-[#34d399]">
                        <Terminal className="w-4 h-4" />
                        Usūl al-Fiqh Debate Log
                      </h3>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      </div>
                    </div>
                    <div className="p-6 bg-[#020403]/80 max-h-[400px] overflow-y-auto custom-scrollbar font-mono text-sm text-[#34d399] whitespace-pre-wrap leading-relaxed">
                      {analysisResult.internalDebate}
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: AI Draft */}
                <motion.div className="glass-panel rounded-sm border border-[#d4af37]/30 overflow-hidden flex flex-col h-[800px]">
                  <div className="bg-black/40 border-b border-[#d4af37]/30 p-5 flex items-center justify-between">
                    <h3 className="font-serif text-xl flex items-center gap-3 text-[#d4af37]">
                      <ScrollText className="w-6 h-6" />
                      Usūl al-Fiqh Analysis
                    </h3>
                    <span className="text-xs font-mono tracking-widest px-3 py-1 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 rounded-sm uppercase">
                      Read-Only
                    </span>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    <div className="flex items-center justify-between p-4 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-sm">
                      <div>
                        <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-widest mb-1">Preliminary Ruling</div>
                        <div className={`text-2xl font-serif font-bold ${
                          analysisResult.ruling.toLowerCase().includes('halal') ? 'text-emerald-400' :
                          analysisResult.ruling.toLowerCase().includes('haram') ? 'text-red-400' :
                          'text-amber-400'
                        }`}>{analysisResult.ruling}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-widest mb-1">Ruling Strength</div>
                        <div className="text-xl font-serif text-[#d4af37]">{analysisResult.rulingStrength} <span className="text-sm font-mono opacity-50">({analysisResult.rulingScore}/100)</span></div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">ʿIllah (Effective Cause)</h4>
                      <p className="font-serif text-slate-300 leading-relaxed">{analysisResult.illahIdentified}</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Tahqīq al-Manāt (Reality Check)</h4>
                      <p className="font-serif text-slate-300 leading-relaxed">{analysisResult.tahqiqAlManat}</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Dalīl Stack</h4>
                      <div className="space-y-3">
                        {analysisResult.dalilStack?.map((dalil: any, idx: number) => (
                          <div key={idx} className="p-3 border border-[#d4af37]/20 bg-black/30 rounded-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold font-serif text-[#d4af37]">{dalil.source}</span>
                              <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded-sm text-slate-300">{dalil.grade} (Wt: {dalil.weight})</span>
                            </div>
                            <p className="text-sm font-serif text-slate-400">{dalil.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {analysisResult.aaoifi_evidence && analysisResult.aaoifi_evidence.length > 0 && (
                      <div>
                        <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">AAOIFI Standards Compliance</h4>
                        <div className="space-y-3">
                          {analysisResult.aaoifi_evidence.map((evidence: any, idx: number) => (
                            <div key={idx} className="p-3 border border-blue-500/30 bg-blue-950/20 rounded-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold font-serif text-blue-400">Standard {evidence.standard_id}: {evidence.topic}</span>
                                <span className="text-xs font-mono px-2 py-1 bg-blue-900/50 rounded-sm text-blue-300">Wt: {evidence.weight} | Score: {evidence.dalil_score_contribution}</span>
                              </div>
                              <p className="text-sm font-serif text-slate-300 mb-2">{evidence.finding}</p>
                              <p className="text-xs font-mono text-blue-300/70 italic border-l-2 border-blue-500/30 pl-2">{evidence.relevance_notes}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Contrary View Considered</h4>
                      <p className="font-serif text-slate-300 leading-relaxed italic border-l-2 border-red-500/50 pl-4">{analysisResult.contraryView}</p>
                    </div>

                    {analysisResult.riskMetrics && (
                      <div>
                        <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Risk & Purification Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/30 p-3 rounded-sm border border-[#d4af37]/20">
                            <div className="text-xs font-mono text-[#94a3b8] uppercase mb-1">Non-Permissible Revenue</div>
                            <div className="text-xl font-serif text-red-400">{analysisResult.riskMetrics.non_permissible_revenue_pct}%</div>
                          </div>
                          <div className="bg-black/30 p-3 rounded-sm border border-[#d4af37]/20">
                            <div className="text-xs font-mono text-[#94a3b8] uppercase mb-1">Riba Exposure</div>
                            <div className="text-xl font-serif text-red-400">{analysisResult.riskMetrics.riba_exposure_score}/100</div>
                          </div>
                          <div className="bg-black/30 p-3 rounded-sm border border-[#d4af37]/20">
                            <div className="text-xs font-mono text-[#94a3b8] uppercase mb-1">Gharar Exposure</div>
                            <div className="text-xl font-serif text-amber-400">{analysisResult.riskMetrics.gharar_exposure_score}/100</div>
                          </div>
                          <div className="bg-black/30 p-3 rounded-sm border border-[#d4af37]/20">
                            <div className="text-xs font-mono text-[#94a3b8] uppercase mb-1">Maysir Exposure</div>
                            <div className="text-xl font-serif text-amber-400">{analysisResult.riskMetrics.maysir_exposure_score}/100</div>
                          </div>
                          <div className="bg-black/30 p-3 rounded-sm border border-[#d4af37]/20 col-span-2">
                            <div className="text-xs font-mono text-[#94a3b8] uppercase mb-1">Centralization / Ownership Risk</div>
                            <div className="text-xl font-serif text-blue-400">{analysisResult.riskMetrics.centralization_risk_score}/100</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {analysisResult.areasNeedingReview && analysisResult.areasNeedingReview.length > 0 && (
                      <div>
                        <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Areas Needing Mufti Review</h4>
                        <ul className="list-disc list-inside space-y-2 text-amber-300 font-serif">
                          {analysisResult.areasNeedingReview.map((area: string, idx: number) => (
                            <li key={idx}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.xai_explanations && analysisResult.xai_explanations.length > 0 && (
                      <div>
                        <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">XAI Reasoning Trace</h4>
                        <ul className="space-y-3">
                          {analysisResult.xai_explanations.map((explanation: string, idx: number) => (
                            <li key={idx} className="p-3 border border-purple-500/30 bg-purple-950/20 rounded-sm text-sm font-serif text-purple-200">
                              {explanation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.knowledge_graph && analysisResult.knowledge_graph.nodes && (
                      <div>
                        <h4 className="text-lg font-serif text-white mb-3 border-b border-[#d4af37]/20 pb-2">Knowledge Graph Nodes</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.knowledge_graph.nodes.map((node: any, idx: number) => (
                            <div key={idx} className="px-2 py-1 text-xs font-mono border border-slate-700 bg-slate-800/50 rounded-sm text-slate-300" title={node.notes}>
                              <span className="text-[#d4af37]">{node.type}:</span> {node.node_id}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>

                {/* Right Column: Scholar Editor */}
                <motion.div className="glass-panel rounded-sm border border-[#d4af37]/50 overflow-hidden flex flex-col h-[800px] shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                  <div className="bg-[#d4af37]/10 border-b border-[#d4af37]/30 p-5 flex items-center justify-between">
                    <h3 className="font-serif text-xl flex items-center gap-3 text-white">
                      <BookOpen className="w-6 h-6 text-[#d4af37]" />
                      Scholar Decree
                    </h3>
                    <span className="text-xs font-mono tracking-widest px-3 py-1 bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded-sm uppercase">
                      Editable
                    </span>
                  </div>
                  <div className="flex-1 p-0 flex flex-col relative">
                    <textarea
                      value={scholarNotes}
                      onChange={(e) => setScholarNotes(e.target.value)}
                      className="flex-1 w-full p-8 resize-none focus:outline-none bg-black/60 font-serif text-lg text-slate-200 leading-relaxed custom-scrollbar"
                      placeholder="Review and edit the fatwa draft here before approving..."
                    />
                  </div>
                  <div className="p-5 border-t border-[#d4af37]/30 bg-black/40 flex items-center justify-between">
                    <div className="text-sm font-mono text-[#94a3b8]">
                      Target: <span className="text-[#d4af37]">{assetQuery}</span>
                    </div>
                    <button
                      onClick={handleApprove}
                      disabled={isSaving}
                      className="bg-[#d4af37] hover:bg-[#bf953f] disabled:bg-[#d4af37]/20 disabled:text-[#d4af37]/50 text-black px-8 py-3 rounded-sm font-bold tracking-widest uppercase transition-all flex items-center gap-3 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sealing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Seal & Approve
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
            )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Knowledge Base Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/30" />
            <h2 className="text-3xl font-bold font-serif gold-gradient-text tracking-wide uppercase">Approved Decrees</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/30" />
          </div>
          
          {savedFatwas.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-sm border border-[#d4af37]/20 border-dashed">
              <p className="text-[#94a3b8] font-serif italic text-lg">The archives are currently empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedFatwas.map((fatwa, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={fatwa.id} 
                  className="glass-panel rounded-sm border border-[#d4af37]/20 p-8 hover:border-[#d4af37]/60 transition-all hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#d4af37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="font-bold text-xl font-serif text-white truncate pr-4" title={fatwa.asset}>{fatwa.asset}</h3>
                    <span className={`px-3 py-1 text-[10px] font-mono font-bold rounded-sm uppercase tracking-widest border ${
                      fatwa.ruling.toLowerCase().includes('halal') ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' :
                      fatwa.ruling.toLowerCase().includes('haram') ? 'bg-red-950/50 text-red-400 border-red-500/30' :
                      'bg-amber-950/50 text-amber-400 border-amber-500/30'
                    }`}>
                      {fatwa.ruling}
                    </span>
                  </div>
                  <p className="text-sm text-[#94a3b8] line-clamp-4 mb-6 font-serif leading-relaxed">
                    {fatwa.illahIdentified || fatwa.qiyas || "No detailed reasoning provided."}
                  </p>
                  <div className="text-xs font-mono text-[#d4af37]/60 flex items-center justify-between mt-auto pt-4 border-t border-[#d4af37]/10">
                    <span className="flex items-center gap-2">
                      {fatwa.rulingStrength && <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-sm">{fatwa.rulingStrength}</span>}
                    </span>
                    <span className="uppercase tracking-widest">Sealed</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
