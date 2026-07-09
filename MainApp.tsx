import React, { useState, useEffect, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import InvoiceTable from './components/InvoiceTable';
import AddProductModal from './components/AddProductModal';
import TrackerSheets from './components/TrackerSheets';
import { AdminPanel } from './components/AdminPanel';
import { PlatformDashboard } from './components/PlatformDashboard';
import { Login } from './components/Login';
import { AnalysisResult, InvoiceItem, ProcessingStatus, SavedInvoice, Product, UserRole } from './types';
import { analyzeInvoiceImage } from './services/geminiService';
import { getAllGlCodes } from './services/glCodeService';
import { GLCode } from './types';
import { saveInvoiceToHistory, checkForDuplicate, getSavedInvoices } from './services/storageService';
import { saveNewProduct, migrateLocalProductsToDb } from './services/productService';
import { signOut, getSession, getUserRole, getUserName, onAuthStateChange } from './services/authService';
import { supabase } from './services/supabaseClient';

interface LocationData {
  id: string;
  name: string;
  location_code: string | null;
  address?: string | null;
  address_keywords?: string[] | null;
}
interface VendorData {
  id: string;
  canonical_name: string;
  account_code: string | null;
  aliases: string[];
}
interface OrgData {
  id: string;
  name: string;
  plan: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  max_locations: number;
  max_users: number;
  max_invoices_per_month: number;
}
import { exportInvoiceToCSV } from './utils/csvExport';
import { Download, RotateCcw, CheckCircle2, AlertTriangle, AlertCircle, FileText, ExternalLink, LayoutDashboard, TableProperties, MapPin, LogOut, Database, Building2, Calendar, Hash, DollarSign, Tag, CheckCircle, Menu, X, Sparkles, Lock as LockIcon, ShieldCheck, TrendingUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserRole>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('Centerpointe');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  
  const [activeTab, setActiveTab] = useState<'processor' | 'trackers' | 'admin' | 'platform'>('processor');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<SavedInvoice | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // State for Add Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<InvoiceItem | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<SavedInvoice[]>([]);
  // Full saved-invoice list — powers the dashboard widgets
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  // Org's GL codes (from DB) — drives the review-table + add-product dropdowns
  const [glCodes, setGlCodes] = useState<GLCode[]>([]);
  // Which widget's drill-down panel is open ('spikes' | 'month' | null)
  const [widgetDetail, setWidgetDetail] = useState<null | 'spikes' | 'month'>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  // DB-driven role: 'owner' | 'manager' | 'chef' | 'viewer'
  // Real security is enforced by RLS at the database layer — users physically
  // cannot see invoices from locations they don't have access to. The sidebar
  // dropdown simply filters to show only their accessible locations.
  const [userDbRole, setUserDbRole] = useState<string>('owner');
  const [userLocationId, setUserLocationId] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgData | null>(null);
  // True when user arrives via invite or password-recovery email — they must
  // set a password before they can use the app.
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [setPwForm, setSetPwForm] = useState({ pw: '', confirm: '', loading: false, error: '' });

  useEffect(() => {
    // Invite / password-recovery flow. The flag is captured in index.tsx before
    // Supabase clears the hash; we also still check the live hash as a fallback.
    const hash = window.location.hash;
    const pwFlow = (() => { try { return sessionStorage.getItem('chefcode_pw_flow') === '1'; } catch { return false; } })();
    if (pwFlow || hash.includes('type=invite') || hash.includes('type=recovery')) {
      setMustSetPassword(true);
    }
    // Also catch the recovery event directly, in case the flag was missed.
    const recoverySub = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMustSetPassword(true);
    });

    // Check for existing Supabase session on load
    getSession().then((session) => {
      if (session?.user) {
        setCurrentUser(getUserRole(session.user));
        setUserName(getUserName(session.user));
        setUserEmail(session.user.email || '');
      }
    });

    // Listen for auth changes (login/logout from other tabs)
    const subscription = onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(getUserRole(user));
        setUserName(getUserName(user));
        setUserEmail(user.email || '');
      } else {
        setCurrentUser(null);
        setUserName('');
        setUserEmail('');
      }
    });

    const savedLoc = localStorage.getItem('chefcode_location');
    if (savedLoc) setCurrentLocation(savedLoc);

    return () => { subscription.unsubscribe(); recoverySub.data.subscription.unsubscribe(); };
  }, []);

  // Load org-scoped data whenever the user signs in, and clear it on sign-out.
  // This previously ran only on page load — signing in through the Login screen
  // left locations/vendors empty until a full refresh, which is why the Active
  // Location sometimes didn't populate.
  useEffect(() => {
    if (!currentUser) {
      setLocations([]);
      setVendors([]);
      setOrg(null);
      setRecentInvoices([]);
      return;
    }

    const loadRecent = async () => {
      const invoices = await getSavedInvoices();
      setSavedInvoices(invoices);
      setRecentInvoices(invoices.slice(0, 5));
    };
    loadRecent();
    getAllGlCodes().then(setGlCodes).catch(() => {});
    // One-time: rescue any products still trapped in this browser's localStorage
    migrateLocalProductsToDb().catch(() => {});

    // Load locations + vendors + user profile + access list from Supabase
    const loadOrgData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const savedLoc = localStorage.getItem('chefcode_location');

      // Platform-admin flag — isolated query so that if the column doesn't
      // exist yet (migration not run), it fails silently instead of breaking
      // the rest of the org-data load.
      const { data: paRow } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', user.id)
        .single();
      if ((paRow as any)?.is_platform_admin) setIsPlatformAdmin(true);

      const [locRes, vendorRes, profileRes, accessRes] = await Promise.all([
        supabase.from('locations').select('id, name, location_code, address, address_keywords').eq('is_active', true).order('name'),
        supabase.from('vendors').select('id, canonical_name, account_code, aliases').eq('is_active', true).order('canonical_name'),
        supabase.from('profiles').select('role, location_id, org_id').eq('id', user.id).single(),
        supabase.from('user_location_access').select('location_id, role').eq('user_id', user.id),
      ]);

      // Load the org data (for trial banner + limits)
      const profileData: any = profileRes.data;
      if (profileData?.org_id) {
        const { data: orgRow } = await supabase
          .from('organizations')
          .select('id, name, plan, is_trial, trial_ends_at, max_locations, max_users, max_invoices_per_month')
          .eq('id', profileData.org_id)
          .single();
        if (orgRow) setOrg(orgRow as OrgData);
      }

      if (vendorRes.data) setVendors(vendorRes.data as VendorData[]);

      const allLocs = (locRes.data || []) as LocationData[];
      const profile: any = profileRes.data;
      if (profile?.role) setUserDbRole(profile.role);
      if (profile?.location_id) setUserLocationId(profile.location_id);

      // Build set of accessible location IDs
      let accessRows = (accessRes.data || []) as { location_id: string; role: string }[];
      let accessibleIds = new Set(accessRows.map(r => r.location_id));

      // SAFETY NET: If user is an owner and has 0 access entries but their org
      // already has locations (legacy users), auto-grant access to all of them.
      // This fixes accounts created before user_location_access existed.
      if (profile?.role === 'owner' && accessRows.length === 0 && allLocs.length > 0) {
        const grants = allLocs.map(l => ({
          user_id: user.id,
          location_id: l.id,
          role: 'owner',
        }));
        const { error: grantErr } = await supabase
          .from('user_location_access')
          .upsert(grants, { onConflict: 'user_id,location_id' });
        if (!grantErr) {
          accessibleIds = new Set(allLocs.map(l => l.id));
        }
      }

      // Filter org locations to only accessible ones
      const accessibleLocs = allLocs.filter(l => accessibleIds.has(l.id));
      setLocations(accessibleLocs);

      // Pick active location: saved → first accessible
      let activeLoc: LocationData | undefined;
      if (savedLoc) activeLoc = accessibleLocs.find(l => l.name === savedLoc);
      if (!activeLoc && accessibleLocs.length > 0) activeLoc = accessibleLocs[0];

      if (activeLoc) {
        setCurrentLocation(activeLoc.name);
        localStorage.setItem('chefcode_location', activeLoc.name);
      }
    };
    loadOrgData();
  }, [currentUser]);

  // Close the widget drill-down panel on Escape
  useEffect(() => {
    if (!widgetDetail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setWidgetDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [widgetDetail]);

  // Close the mobile menu on Escape (the removed drawer's backdrop used to
  // handle dismissal; the dropdown needs its own).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const handleLogin = (role: UserRole) => {
    setCurrentUser(role);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const loc = e.target.value;
    setCurrentLocation(loc);
    localStorage.setItem('chefcode_location', loc);
  };

  // Helper to convert file to base64 and extract mimeType
  const processFile = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Data URL format: "data:image/jpeg;base64,/9j/4AAQ..."
        // Split at the comma to separate metadata from data
        const [metadata, base64Data] = result.split(',');
        
        // Extract mime type from metadata (e.g., "data:image/jpeg;base64")
        const mimeType = metadata.match(/:(.*?);/)?.[1] || file.type || 'image/png';
        
        resolve({ base64: base64Data, mimeType });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Trial gate: an expired trial must not get free AI extraction.
    if (isReadOnly) {
      setErrorMsg('Your trial has expired. Please upgrade to continue processing invoices.');
      setStatus('error');
      return;
    }
    setStatus('uploading');
    setErrorMsg(null);
    setDuplicateWarning(null);
    setIsSaved(false);

    try {
      const { base64, mimeType } = await processFile(file);
      setPreviewImage(`data:${mimeType};base64,${base64}`);
      setStatus('analyzing');
      const data = await analyzeInvoiceImage(
        base64,
        mimeType,
        locations.map(l => ({ name: l.name, address: l.address, keywords: l.address_keywords }))
      );
      
      data.location = currentLocation;

      // Check for price spikes. Compare each item against the MOST RECENT
      // prior purchase of the same product AT THIS LOCATION. getSavedInvoices
      // returns newest-first, so we sort matches by invoice date and take the
      // latest one strictly before this invoice (guards against out-of-order entry).
      const activeLocId = locations.find(l => l.name === currentLocation)?.id || null;
      const fullHistory = await getSavedInvoices();
      const history = fullHistory.filter(h =>
        activeLocId ? (h.locationId === activeLocId || !h.locationId) : !h.locationId
      );
      const enrichedItems = data.items.map(item => {
        let lastPrice: number | null = null;
        let lastDate: string | null = null;
        for (const inv of history) {
          if (!inv.items) continue;
          const matched = inv.items.find(historyItem =>
            historyItem.description === item.description ||
            (historyItem.productNumber && historyItem.productNumber === item.productNumber)
          );
          if (matched && matched.unitPrice) {
            // Keep the most recent prior price (by invoice date)
            if (!lastDate || (inv.invoiceDate || '') > lastDate) {
              lastPrice = matched.unitPrice;
              lastDate = inv.invoiceDate || '';
            }
          }
        }

        const isSpike = lastPrice !== null && item.unitPrice > lastPrice * 1.10; // 10% spike
        return {
          ...item,
          historicalPrice: lastPrice || undefined,
          historicalDate: lastDate || undefined,
          priceSpike: isSpike
        };
      });
      data.items = enrichedItems;

      // Check for duplicates (scoped to the active location)
      const duplicate = await checkForDuplicate(data, activeLocId);
      if (duplicate) {
        setDuplicateWarning(duplicate);
      }

      setResult(data);
      setStatus('complete');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze invoice. Please try again or check your API key.");
      setStatus('error');
    }
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    if (!result) return;
    const updatedItems = result.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate totalPrice if quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(updatedItem.quantity as any) || 0;
          const price = parseFloat(updatedItem.unitPrice as any) || 0;
          updatedItem.totalPrice = qty * price;
        }
        return updatedItem;
      }
      return item;
    });
    
    setResult({ ...result, items: updatedItems });
  };

  const handleDeleteItem = (id: string) => {
    if (!result) return;
    const updatedItems = result.items.filter(item => item.id !== id);
    setResult({ ...result, items: updatedItems });
  };

  const handleOpenAddProduct = (item: InvoiceItem) => {
    setProductToAdd(item);
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = async (newProduct: Product) => {
    await saveNewProduct(newProduct);

    // Update the item in the current view to show it's now matched
    if (result && productToAdd) {
        const updatedItems = result.items.map(item => 
            item.id === productToAdd.id 
                ? { 
                    ...item, 
                    glCode: newProduct.code, 
                    categoryName: newProduct.category, 
                    isDatabaseMatch: true 
                  }
                : item
        );
        setResult({...result, items: updatedItems});
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
    setDuplicateWarning(null);
    setIsSaved(false);
    setPreviewImage(null);
  };

  const handleSaveAndFinish = async () => {
    if (isReadOnly) {
      setErrorMsg('Your trial has expired. Please upgrade to save invoices.');
      return;
    }
    if (result) {
      try {
        // Look up active location's UUID for proper RLS filtering
        const activeLoc = locations.find(l => l.name === currentLocation);
        await saveInvoiceToHistory(result, activeLoc?.id || null);
        setIsSaved(true);
        // Refresh the widget stats + recent list with the newly saved invoice
        getSavedInvoices().then(invoices => {
          setSavedInvoices(invoices);
          setRecentInvoices(invoices.slice(0, 5));
        });
      } catch (err: any) {
        console.error('Failed to save invoice:', err);
        setErrorMsg('Failed to save invoice. Please try again.');
      }
    }
  };

  const getCleanVendorName = (vendorName: string) => {
    if (!vendorName) return "UnknownVendor";
    const normalized = vendorName.toLowerCase();
    if (normalized.includes('sysco')) return 'Sysco';
    if (normalized.includes('sunrise')) return 'SunRise Produce';
    if (normalized.includes('giuliano')) return 'Giulianos Bakery';
    if (normalized.includes('performance')) return 'Performance';
    if (normalized.includes('spadra')) return 'Spadra';
    if (normalized.includes('pepsi')) return 'Pepsi';
    if (normalized.includes('us food') || normalized.includes('usfood')) return 'US FOOD';
    if (normalized.includes('bon suisse')) return 'Bon Suisse';
    if (normalized.includes('wismettac')) return 'Wismettac';
    if (normalized.includes('m cafe') || normalized.includes('mcafe')) return 'M cafe';
    if (normalized.includes('freshpoint')) return 'Freshpoint';
    if (normalized.includes('unistar')) return 'Unistar Foods';
    if (normalized.includes('southern glazer') || normalized.includes('reliant')) return "Southern Glazer's";
    if (normalized.includes('karat') || normalized.includes('lollicup')) return 'Karat By Lollicup';
    if (normalized.includes('cali dumpling') || normalized.includes('raindrop')) return 'Cali Dumpling';
    if (normalized.includes('coney island') || normalized.includes('golden waffle')) return 'Coney Island';
    if (normalized.includes('ifs')) return 'IFS';
    if (normalized.includes('south shore') || normalized.includes('core mark')) return 'SOUTH SHORE';
    if (normalized.includes('calico')) return 'Calico';
    if (normalized.includes('prudential')) return 'Prudential';
    if (normalized.includes('sharpened')) return 'All Sharpened Knives';
    if (normalized.includes('gna brook')) return 'GNA Brook Fire';
    if (normalized.includes('dallas')) return 'Dallas Bros';
    if (normalized.includes('whirley')) return 'Whirley Drink Works';
    if (normalized.includes('cintas')) return 'CINTAS';
    if (normalized.includes('airgas')) return 'Airgas';
    if (normalized.includes('eco lab') || normalized.includes('ecolab')) return 'ECO LAB';
    if (normalized.includes('don')) return 'DON';
    
    // Fallback: return the original but split by common delimiters to remove location
    return vendorName.split(',')[0].split('-')[0].trim();
  };

  // ── Dashboard widget stats ──
  // Computed from saved invoices for the current location. Invoices saved
  // before locations existed (no location field) are included so legacy data
  // still counts. Month buckets use the YYYY-MM prefix of invoiceDate to
  // avoid UTC parsing shifts; the spike window uses processedAt (when we
  // caught it), falling back to invoiceDate.
  const widgetStats = useMemo(() => {
    const monthKey = (d: string | undefined): string => {
      if (!d) return '';
      const m = d.match(/^(\d{4})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}`;
      const dt = new Date(d.replace(/-/g, '/'));
      return isNaN(dt.getTime()) ? '' : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeLocId = locations.find(l => l.name === currentLocation)?.id || null;

    let countThis = 0, countLast = 0, spendThis = 0;
    let spikeItems = 0, spikeInvoices = 0, overcharge = 0;
    const vendorSpend: Record<string, number> = {};
    const monthInvoices: SavedInvoice[] = [];
    const spikeDetails: { id: string; vendorName: string; invoiceNumber: string; invoiceDate: string; items: { description: string; unit: number; hist: number; qty: number }[] }[] = [];

    for (const inv of savedInvoices) {
      // Scope to the active location by UUID (survives location renames);
      // legacy invoices with no location_id are included.
      if (inv.locationId) {
        if (inv.locationId !== activeLocId) continue;
      } else if (inv.location && inv.location !== currentLocation) {
        continue;
      }

      const mk = monthKey(inv.invoiceDate);
      const amt = Number(inv.totalAmount) || 0;
      if (mk === thisMonth) {
        countThis++;
        spendThis += amt;
        monthInvoices.push(inv);
        const v = getCleanVendorName(inv.vendorName || '');
        vendorSpend[v] = (vendorSpend[v] || 0) + amt;
      } else if (mk === lastMonth) {
        countLast++;
      }

      const procTime = new Date(inv.processedAt || inv.invoiceDate).getTime();
      if (!isNaN(procTime) && procTime >= cutoff && inv.items) {
        const spiked: { description: string; unit: number; hist: number; qty: number }[] = [];
        for (const it of inv.items) {
          if (it.priceSpike) {
            spikeItems++;
            const hist = Number(it.historicalPrice);
            const unit = Number(it.unitPrice);
            const qty = Number(it.quantity) || 0;
            if (hist > 0 && unit > hist) overcharge += (unit - hist) * qty;
            spiked.push({ description: it.description, unit, hist, qty });
          }
        }
        if (spiked.length > 0) {
          spikeInvoices++;
          spikeDetails.push({
            id: inv.id,
            vendorName: inv.vendorName,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            items: spiked,
          });
        }
      }
    }

    monthInvoices.sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
    spikeDetails.sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
    const topVendor = Object.entries(vendorSpend).sort((a, b) => b[1] - a[1])[0] || null;
    return { countThis, countLast, spendThis, topVendor, spikeItems, spikeInvoices, overcharge, monthInvoices, spikeDetails };
  }, [savedInvoices, currentLocation, locations]);

  // Always show cents — this is accounting data, and rounding hides small
  // overcharges (e.g. a $0.40 spike would otherwise read as "$0").
  const fmtMoney = (n: number) =>
    '$' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Lookup vendor account code (F02124, F02198, etc.) by matching invoice vendor name
  // against the vendors table in Supabase
  const getVendorAccountCode = (vendorName: string): string => {
    if (!vendorName || vendors.length === 0) return '';
    const normalized = vendorName.toLowerCase();
    const matched = vendors.find(v => {
      const canonName = (v.canonical_name || '').toLowerCase();
      if (normalized.includes(canonName) || canonName.includes(normalized.split(',')[0].trim())) return true;
      return (v.aliases || []).some(a => normalized.includes((a || '').toLowerCase()));
    });
    return matched?.account_code || '';
  };

  // Lookup current location's code (170130, 170131, etc.)
  const getCurrentLocationCode = (): string => {
    const loc = locations.find(l => l.name === currentLocation);
    return loc?.location_code || '';
  };

  const handleDownloadUpdatedInvoice = async () => {
    if (!result || !previewImage) return;

    const cleanVendor = getCleanVendorName(result.vendorName);
    const safeVendor = cleanVendor.replace(/[/\\?%*:|"<>]/g, '-');
    const safeInvNum = (result.invoiceNumber || "UnknownInvoice").replace(/[/\\?%*:|"<>]/g, '-');
    const totalAmt = parseFloat(result.totalAmount as any) || 0;

    // Build prefix: VENDOR_CODE LOCATION_CODE (e.g. "F02124 170130")
    // Falls back gracefully if codes aren't set yet
    const vendorCode = getVendorAccountCode(result.vendorName);
    const locCode = getCurrentLocationCode();
    const codePrefix = [vendorCode, locCode].filter(Boolean).join(' ');
    const fileName = codePrefix
      ? `${codePrefix} ${safeVendor} ${safeInvNum} $${totalAmt.toFixed(2)}.pdf`
      : `${safeVendor} ${safeInvNum} $${totalAmt.toFixed(2)}.pdf`;

    const doc = new jsPDF();
    
    // Page 1: Cover Page
    doc.setFontSize(22);
    doc.text("Invoice Summary", 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Vendor Name: ${result.vendorName}`, 20, 50);
    doc.text(`Invoice Date: ${result.invoiceDate || 'N/A'}`, 20, 60);
    doc.text(`Invoice Number: ${result.invoiceNumber || 'N/A'}`, 20, 70);
    doc.text(`Total Amount: $${totalAmt.toFixed(2)}`, 20, 80);
    
    doc.setFontSize(16);
    doc.text("GL Code Breakdown", 20, 100);
    
    // Calculate category breakdown by GL Code
    const codeTotals: Record<string, number> = {};
    result.items.forEach(item => {
      const code = item.glCode || 'Uncategorized';
      codeTotals[code] = (codeTotals[code] || 0) + (parseFloat(item.totalPrice as any) || 0);
    });
    
    let yPos = 115;
    doc.setFontSize(12);
    Object.entries(codeTotals).forEach(([code, total]) => {
      doc.text(`${code}: $${total.toFixed(2)}`, 20, yPos);
      yPos += 10;
    });

    if (previewImage.startsWith('data:image/')) {
      // Page 2: Original Invoice Image
      doc.addPage();
      
      try {
        // Calculate aspect ratio to fit image on page
        const imgProps = doc.getImageProperties(previewImage);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        const imgRatio = imgProps.width / imgProps.height;
        const pdfRatio = pdfWidth / pdfHeight;
        
        let finalWidth = pdfWidth;
        let finalHeight = pdfHeight;
        
        if (imgRatio > pdfRatio) {
          // Image is wider than page
          finalWidth = pdfWidth;
          finalHeight = pdfWidth / imgRatio;
        } else {
          // Image is taller than page
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * imgRatio;
        }
        
        // Center the image
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;
        
        let format = previewImage.substring(previewImage.indexOf('/') + 1, previewImage.indexOf(';')).toUpperCase();
        if (format === 'JPEG') format = 'JPEG';
        else if (format === 'JPG') format = 'JPEG';
        
        doc.addImage(previewImage, format, xOffset, yOffset, finalWidth, finalHeight);
      } catch (e) {
        console.error("Error adding image to PDF:", e);
        doc.setFontSize(12);
        doc.text("Error: Could not attach the original invoice image.", 20, 30);
      }
      doc.save(fileName);
    } else if (previewImage.startsWith('data:application/pdf')) {
      try {
        // Merge the jsPDF output with the original PDF using pdf-lib
        const coverPdfBytes = doc.output('arraybuffer');
        const mergedPdf = await PDFDocument.load(coverPdfBytes);
        
        const originalPdfBytes = await fetch(previewImage).then(res => res.arrayBuffer());
        const originalPdf = await PDFDocument.load(originalPdfBytes);
        
        const copiedPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        
        const mergedPdfBytes = await mergedPdf.save();
        
        // Create a blob and download
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Error merging PDF:", e);
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Error: Could not attach the original invoice PDF.", 20, 30);
        doc.save(fileName);
      }
    } else {
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Original invoice was an unsupported format and cannot be attached.", 20, 30);
      doc.save(fileName);
    }
  };

  const handleOpenPreview = () => {
    if (previewImage) {
      const newTab = window.open();
      if (newTab) {
        if (previewImage.startsWith('data:application/pdf')) {
          newTab.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invoice Preview</title>
                <style>
                  body { margin: 0; background-color: #0f172a; height: 100vh; overflow: hidden; }
                  iframe { width: 100%; height: 100%; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${previewImage}"></iframe>
              </body>
            </html>
          `);
        } else {
          newTab.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invoice Preview</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: #0f172a; height: 100vh; }
                  img { max-width: 100%; max-height: 100%; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${previewImage}" alt="Invoice Preview" />
              </body>
            </html>
          `);
        }
        newTab.document.close();
      } else {
        alert("Please allow popups to view the invoice preview.");
      }
    }
  };

  // Address verification — AI match first, keyword fallback.
  // The AI compares the invoice's Ship To address against the org's registered
  // locations (name + address) during analysis; result.matchedLocation holds the
  // matched location name or ''. Keyword matching remains as a fallback for
  // locations with manually curated address_keywords.
  // Returns:
  //   'verified'        → invoice address matches the CURRENT location
  //   'wrong-location'  → invoice address matches a DIFFERENT location (cross-location warning)
  //   'unverified'      → no match found anywhere, but address was detected
  //   'no-address'      → no delivery address extracted from invoice
  const addressVerification = (() => {
    if (!result?.deliveryAddress) return { status: 'no-address' as const, matchedLocation: null };
    const addrLower = result.deliveryAddress.toLowerCase();

    // 1) AI-matched location (validated against our list in geminiService)
    if (result.matchedLocation) {
      const aiLoc = locations.find(l => l.name === result.matchedLocation);
      if (aiLoc) {
        return aiLoc.name === currentLocation
          ? { status: 'verified' as const, matchedLocation: aiLoc }
          : { status: 'wrong-location' as const, matchedLocation: aiLoc };
      }
    }

    // 2) Fallback: manual address_keywords matching
    const findMatch = (loc: LocationData) => {
      const kws = loc.address_keywords || [];
      return kws.some(kw => kw && addrLower.includes(kw.toLowerCase()));
    };

    const currentLoc = locations.find(l => l.name === currentLocation);
    if (currentLoc && findMatch(currentLoc)) {
      return { status: 'verified' as const, matchedLocation: currentLoc };
    }
    // Check OTHER locations for cross-location warning
    const otherMatched = locations.find(l => l.name !== currentLocation && findMatch(l));
    if (otherMatched) {
      return { status: 'wrong-location' as const, matchedLocation: otherMatched };
    }
    return { status: 'unverified' as const, matchedLocation: null };
  })();

  const isValidAddress = addressVerification.status === 'verified';

  // ── Trial Status (drives banner + read-only mode) ──
  const trialStatus = (() => {
    if (!org) return { status: 'unknown' as const, daysLeft: null as number | null };
    if (!org.is_trial) return { status: 'paid' as const, daysLeft: null };
    if (!org.trial_ends_at) return { status: 'unknown' as const, daysLeft: null };
    const end = new Date(org.trial_ends_at).getTime();
    const now = Date.now();
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { status: 'expired' as const, daysLeft: 0 };
    if (daysLeft <= 3) return { status: 'ending-soon' as const, daysLeft };
    return { status: 'active' as const, daysLeft };
  })();
  const isReadOnly = trialStatus.status === 'expired';

  // ── Password setup handler (invite / recovery flow) ──
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetPwForm(f => ({ ...f, error: '' }));

    if (setPwForm.pw.length < 6) {
      setSetPwForm(f => ({ ...f, error: 'Password must be at least 6 characters.' }));
      return;
    }
    if (setPwForm.pw !== setPwForm.confirm) {
      setSetPwForm(f => ({ ...f, error: 'Passwords do not match.' }));
      return;
    }

    setSetPwForm(f => ({ ...f, loading: true }));
    try {
      const { error } = await supabase.auth.updateUser({ password: setPwForm.pw });
      if (error) throw error;
      // Clean the auth tokens out of the URL, then continue into the app
      window.history.replaceState(null, '', window.location.pathname);
      try { sessionStorage.removeItem('chefcode_pw_flow'); } catch { /* ignore */ }
      setMustSetPassword(false);
      setSetPwForm({ pw: '', confirm: '', loading: false, error: '' });
    } catch (err: any) {
      setSetPwForm(f => ({ ...f, loading: false, error: err.message || 'Failed to set password.' }));
    }
  };

  // ── Set Password Screen (shown after clicking invite/recovery email) ──
  if (mustSetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="ChefCode" className="inline-block w-16 h-16 rounded-2xl shadow-xl shadow-cyan-500/20 mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Set Your Password</h1>
            <p className="text-sm text-slate-600 mt-2">
              Welcome to ChefCode<span className="text-cyan-600">.ai</span>! Choose a password to finish setting up your account.
            </p>
          </div>

          <form onSubmit={handleSetPassword} className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon size={16} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setPwForm.pw}
                  onChange={(e) => setSetPwForm(f => ({ ...f, pw: e.target.value, error: '' }))}
                  className="w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon size={16} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setPwForm.confirm}
                  onChange={(e) => setSetPwForm(f => ({ ...f, confirm: e.target.value, error: '' }))}
                  className="w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            {setPwForm.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{setPwForm.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={setPwForm.loading || !setPwForm.pw || !setPwForm.confirm}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-md disabled:opacity-50 transition-all"
            >
              {setPwForm.loading ? <CheckCircle2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {setPwForm.loading ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            By continuing, you agree to ChefCode's Terms of Service
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }



  // Single source of truth for the nav tabs — rendered by both the desktop
  // top bar (short label) and the mobile dropdown (full label).
  const navTabs = [
    { key: 'processor' as const, label: 'Processor', fullLabel: 'Invoice Processor', Icon: LayoutDashboard, show: true },
    { key: 'trackers' as const, label: 'Trackers', fullLabel: 'Tracker Sheets', Icon: TableProperties, show: currentUser === 'admin' },
    { key: 'admin' as const, label: 'Admin', fullLabel: 'Admin Panel', Icon: Database, show: currentUser === 'admin' },
    { key: 'platform' as const, label: 'Platform', fullLabel: 'Platform Admin', Icon: ShieldCheck, show: isPlatformAdmin },
  ].filter(t => t.show);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">

      {/* ═══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR (replaces the old sidebar)
          ═══════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-cream-200 sticky top-0 z-50 flex-shrink-0">
        {/* Full-bleed bar: logo hugs the left corner, user controls hug the
            right — no centered max-width (that's only for content below). */}
        <div className="px-4 sm:px-5 h-16 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="ChefCode" className="w-9 h-9 rounded-xl" />
            <h1 className="text-lg font-bold tracking-tight text-brand-900 whitespace-nowrap">
              ChefCode<span className="text-brand-600">.ai</span>
            </h1>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                aria-current={activeTab === t.key ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeTab === t.key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-brand-700 hover:bg-cream-100'
                }`}
              >
                <t.Icon size={15} />
                {t.label}
              </button>
            ))}
          </nav>

          {/* Right: location + user + sign out */}
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 border border-cream-300 rounded-full pl-3 pr-2 py-1.5 bg-white">
              <MapPin size={13} className="text-brand-600 shrink-0" />
              {locations.length === 0 ? (
                <span className="text-xs text-slate-500 italic pr-1.5">No locations</span>
              ) : (
                <select
                  value={currentLocation}
                  onChange={handleLocationChange}
                  aria-label="Active location"
                  className="bg-transparent border-none text-base font-medium text-slate-700 focus:ring-0 p-0 pr-5 cursor-pointer"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}{loc.location_code ? ` (${loc.location_code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-cream-200">
              <div title={currentUser === 'admin' ? 'Admin' : 'Chef'} className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block leading-tight">
                <p className="text-xs font-semibold text-slate-800 max-w-[150px] truncate">{userName || 'User'}</p>
                <p className="text-[10px] text-slate-500 max-w-[150px] truncate">{userEmail || (currentUser === 'admin' ? 'Admin' : 'Chef')}</p>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-cream-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu (dropdown) */}
        {mobileMenuOpen && (
          <>
            {/* Invisible backdrop below the bar: tapping outside the menu closes it
                (starts at top-16 so the bar's own controls stay clickable) */}
            <div className="fixed inset-x-0 top-16 bottom-0 md:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
            <div className="relative md:hidden border-t border-cream-200 bg-white px-4 py-3 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto">
            {navTabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setMobileMenuOpen(false); }}
                aria-current={activeTab === t.key ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left ${
                  activeTab === t.key ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-cream-100'
                }`}
              >
                <t.Icon size={16} />
                {t.fullLabel}
              </button>
            ))}

            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-cream-200 mt-2 pt-3">
              <MapPin size={14} className="text-brand-600 shrink-0" />
              {locations.length === 0 ? (
                <span className="text-sm text-slate-500 italic">No locations</span>
              ) : (
                <select
                  value={currentLocation}
                  onChange={handleLocationChange}
                  aria-label="Active location"
                  className="bg-transparent border-none text-base font-medium text-slate-700 focus:ring-0 p-0 flex-1 cursor-pointer"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}{loc.location_code ? ` (${loc.location_code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-cream-50 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
            </div>
          </>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT WRAPPER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Trial Banner ── */}
        {org && org.is_trial && trialStatus.status !== 'unknown' && (
          <div className={`flex-shrink-0 px-4 sm:px-6 lg:px-8 py-2 text-xs font-medium flex items-center justify-between gap-3 ${
            trialStatus.status === 'expired'
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              : trialStatus.status === 'ending-soon'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                : 'bg-brand-50 border-b border-brand-100 text-brand-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={13} className={trialStatus.status === 'active' ? 'text-brand-600' : 'text-white'} />
              <span className="truncate">
                {trialStatus.status === 'expired' ? (
                  <><strong>Trial expired.</strong> Your account is read-only. Upgrade to continue using ChefCode.</>
                ) : trialStatus.status === 'ending-soon' ? (
                  <><strong>Trial ending soon —</strong> only {trialStatus.daysLeft} day{trialStatus.daysLeft !== 1 ? 's' : ''} left on your {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} plan.</>
                ) : (
                  <><strong>Free trial active</strong> — {trialStatus.daysLeft} days left on your {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} plan.</>
                )}
              </span>
            </div>
            <a
              href="mailto:sales@chefcode.ai?subject=Upgrade%20to%20Paid%20Plan"
              className={`whitespace-nowrap font-bold underline hover:no-underline ${trialStatus.status === 'active' ? 'text-brand-700' : 'text-white'}`}
            >
              Upgrade →
            </a>
          </div>
        )}

        {/* ── Page Header Row (title + contextual actions) — sticky under the
            top bar so New Scan / CSV / PDF stay reachable on long tables ── */}
        <div className="sticky top-16 z-30 bg-white/85 backdrop-blur-md border-b border-cream-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Page title + breadcrumb */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {activeTab === 'processor' ? 'Invoice Processor' : activeTab === 'trackers' ? 'Tracker Sheets' : activeTab === 'platform' ? 'Platform Admin' : 'Admin Panel'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {activeTab === 'processor'
                  ? status === 'complete' ? 'Review extracted invoice data' : 'Upload and process supplier invoices'
                  : activeTab === 'trackers' ? 'Monthly spend tracking and reports'
                  : 'Manage products, vendors, and settings'
                }
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
             {activeTab === 'processor' && status === 'complete' && (
               <>
                 <button
                  onClick={handleReset}
                  className="inline-flex items-center px-3.5 py-2 border border-slate-200 text-[13px] font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500/40 transition-all shadow-sm"
                 >
                   <RotateCcw size={14} className="mr-2 text-slate-400" />
                   New Scan
                 </button>
                 <button
                  onClick={() => result && exportInvoiceToCSV(result as SavedInvoice)}
                  className="inline-flex items-center px-3.5 py-2 border border-slate-200 text-[13px] font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500/40 transition-all shadow-sm"
                 >
                   <Download size={14} className="mr-2 text-slate-400" />
                   CSV
                 </button>
                 <button
                  onClick={handleDownloadUpdatedInvoice}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-semibold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500/40 transition-all shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30"
                 >
                   <Download size={14} className="mr-2" />
                   PDF
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${status}-${isSaved}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'platform' ? (
                  <PlatformDashboard />
                ) : activeTab === 'admin' ? (
                  <AdminPanel />
                ) : activeTab === 'trackers' ? (
                  <TrackerSheets location={currentLocation} />
                ) : isSaved ? (
               <div className="flex flex-col items-center justify-center py-16">
                  {/* Success animation */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                    className="relative mb-6"
                  >
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl scale-150" />
                    <div className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-2xl shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 size={40} className="text-white" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <h2 className="text-2xl font-extrabold text-slate-900">Invoice Saved!</h2>
                    <p className="text-slate-500 mt-2 mb-2 text-sm max-w-sm">
                      Successfully processed and saved to your database.
                    </p>
                    {result && (
                      <div className="inline-flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2 mt-2 mb-8">
                        <span className="text-xs font-semibold text-slate-500">{result.vendorName}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-mono text-slate-500">#{result.invoiceNumber}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-bold text-slate-700">${(parseFloat(result.totalAmount as any) || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={handleDownloadUpdatedInvoice}
                      className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5"
                    >
                      <Download size={16} />
                      Download PDF
                    </button>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-sm font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      <RotateCcw size={16} />
                      New Scan
                    </button>
                  </motion.div>
               </div>
            ) : status === 'idle' || status === 'uploading' || status === 'analyzing' || status === 'error' ? (
          <div className="max-w-5xl mx-auto mt-6">
            {/* ── No-Access Banner ── */}
            {locations.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4"
              >
                <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                  <MapPin className="text-amber-600" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-amber-900">No Location Access</h3>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    You don't have access to any locations yet.{' '}
                    {userDbRole === 'owner' ? (
                      <>Go to <strong>Admin Panel → Locations</strong> to create your first location.</>
                    ) : (
                      <>Ask your organization owner to grant you access to a location.</>
                    )}
                  </p>
                  {userDbRole === 'owner' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Database size={14} />
                      Go to Admin Panel
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Dashboard Widgets ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <button type="button" onClick={() => setWidgetDetail('month')} title="View this month's invoices" className="text-left bg-white rounded-2xl border border-cream-200 p-4 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <FileText size={14} className="text-brand-600 shrink-0" /> Invoices this month
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">{widgetStats.countThis}</p>
                <p className={`text-[11px] mt-0.5 ${widgetStats.countThis - widgetStats.countLast >= 0 ? 'text-brand-600' : 'text-slate-500'}`}>
                  {widgetStats.countThis - widgetStats.countLast >= 0 ? '+' : ''}{widgetStats.countThis - widgetStats.countLast} vs last month
                </p>
              </button>

              <button type="button" onClick={() => setWidgetDetail('spikes')} title="View invoices with price spikes" className="text-left bg-white rounded-2xl border border-cream-200 p-4 hover:border-amber-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" /> Price spikes (30d)
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">{widgetStats.spikeItems}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  across {widgetStats.spikeInvoices} invoice{widgetStats.spikeInvoices === 1 ? '' : 's'}
                </p>
              </button>

              <button type="button" onClick={() => setWidgetDetail('spikes')} title="View invoices with price spikes" className="text-left bg-brand-900 rounded-2xl p-4 hover:bg-brand-800 transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-200">
                  <DollarSign size={14} className="text-cream-100 shrink-0" /> Est. overcharges caught
                </div>
                <p className="text-2xl font-bold text-cream-100 mt-1">{fmtMoney(widgetStats.overcharge)}</p>
                <p className="text-[11px] text-brand-200 mt-0.5">last 30 days</p>
              </button>

              <button type="button" onClick={() => setWidgetDetail('month')} title="View this month's invoices" className="text-left bg-white rounded-2xl border border-cream-200 p-4 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <TrendingUp size={14} className="text-brand-600 shrink-0" /> Spend this month
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">{fmtMoney(widgetStats.spendThis)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {widgetStats.topVendor ? `top: ${widgetStats.topVendor[0]} · ${fmtMoney(widgetStats.topVendor[1])}` : 'no invoices this month'}
                </p>
              </button>
            </div>

            {/* ── File Upload Dropzone ── */}
            <FileUpload
              onFileSelect={handleFileSelect}
              isProcessing={status === 'analyzing' || status === 'uploading'}
            />

            {/* ── Error Alert ── */}
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3"
              >
                <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">{errorMsg}</p>
                </div>
                <button onClick={handleReset} className="text-sm font-semibold text-red-600 hover:text-red-800 whitespace-nowrap">
                  Try again
                </button>
              </motion.div>
            )}


            {/* ── Recent Activity ── */}
            <div className="mt-14 pt-10 border-t border-slate-200/60">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-50">
                    <Calendar size={18} className="text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                </div>
                <button
                  onClick={() => setActiveTab('trackers')}
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                >
                  View All <ExternalLink size={13} />
                </button>
              </div>

              {recentInvoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentInvoices.map((invoice, idx) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="bg-white p-4 rounded-xl border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center text-cyan-600 group-hover:from-cyan-100 group-hover:to-blue-100 transition-colors shrink-0 border border-cyan-100">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{invoice.vendorName || 'Unknown Vendor'}</p>
                          <p className="text-xs text-slate-400 flex items-center mt-0.5 font-mono">
                            #{invoice.invoiceNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-slate-900">${parseFloat(invoice.totalAmount as any || 0).toFixed(2)}</p>
                        <p className="text-[11px] text-slate-400">{new Date(invoice.processedAt).toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-14 bg-gradient-to-br from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-200/60 border-dashed">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7 text-slate-300" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No invoices yet</h4>
                  <p className="text-sm text-slate-500 mt-1">Upload your first invoice above to get started.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3"
              >
                <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                  <AlertTriangle className="text-amber-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-amber-900">Possible Duplicate Invoice</h4>
                  <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                    Invoice <strong>#{duplicateWarning.invoiceNumber}</strong> from <strong>{duplicateWarning.vendorName}</strong> was processed on {new Date(duplicateWarning.processedAt).toLocaleDateString()}.
                  </p>
                </div>
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {result && (
              <>
                 {/* ── Review Header ── */}
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-600 rounded-xl border border-cyan-100">
                       <FileText size={22} />
                     </div>
                     <div>
                       <h2 className="text-xl font-bold text-slate-900 leading-tight">Invoice Review</h2>
                       <p className="text-xs text-slate-500 mt-0.5">Verify extracted details before saving</p>
                     </div>
                   </div>
                   {previewImage && (
                     <button
                       onClick={handleOpenPreview}
                       className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-[13px] font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                     >
                       <ExternalLink size={14} />
                       View Original
                     </button>
                   )}
                 </div>

                 {/* ── Invoice Details Card ── */}
                 <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                   {/* Address Verification Banner — dynamic, DB-driven */}
                   {(() => {
                     const av = addressVerification;
                     // Colors per status
                     const styles = {
                       'verified':       { bg: 'bg-emerald-50/60 border-emerald-100', icon: <CheckCircle className="text-emerald-500 shrink-0" size={16} />, title: 'text-emerald-800', titleText: 'Address Verified', sub: 'text-emerald-600' },
                       'wrong-location': { bg: 'bg-red-50/70 border-red-200',         icon: <AlertTriangle className="text-red-500 shrink-0" size={16} />,   title: 'text-red-800',    titleText: 'Wrong Location!',  sub: 'text-red-600' },
                       'unverified':     { bg: 'bg-amber-50/60 border-amber-100',     icon: <AlertTriangle className="text-amber-500 shrink-0" size={16} />, title: 'text-amber-800',  titleText: 'Address Not Verified', sub: 'text-amber-600' },
                       'no-address':     { bg: 'bg-slate-50/60 border-slate-100',     icon: <AlertCircle className="text-slate-400 shrink-0" size={16} />,   title: 'text-slate-700',  titleText: 'No Address Detected', sub: 'text-slate-500' },
                     } as const;
                     const s = styles[av.status];
                     return (
                       <div className={`px-5 py-3 border-b flex items-center gap-2.5 ${s.bg}`}>
                         {s.icon}
                         <div className="flex-1 min-w-0">
                           <span className={`text-xs font-semibold ${s.title}`}>{s.titleText}</span>
                           {av.status === 'wrong-location' && av.matchedLocation && (
                             <span className="text-xs ml-2 text-red-700 font-semibold">
                               Looks like <span className="font-bold underline">{av.matchedLocation.name}</span>, but you're at <span className="font-bold">{currentLocation}</span>
                             </span>
                           )}
                           {av.status !== 'wrong-location' && (
                             <span className={`text-xs ml-2 ${s.sub}`}>
                               {result.deliveryAddress || "Not detected on invoice"}
                             </span>
                           )}
                         </div>
                       </div>
                     );
                   })()}

                   {/* Vendor Code + Location Code Banner */}
                   {(() => {
                     const vCode = getVendorAccountCode(result.vendorName);
                     const lCode = getCurrentLocationCode();
                     const hasMissing = !vCode || !lCode;
                     return (
                       <div className={`px-5 py-3 border-b flex items-center gap-3 ${hasMissing ? 'bg-amber-50/60 border-amber-100' : 'bg-slate-50/60 border-slate-100'}`}>
                         <div className="flex items-center gap-2 flex-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference</span>
                           <div className="flex items-center gap-1.5">
                             <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${vCode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} title="Vendor account code">
                               {vCode || 'No vendor code'}
                             </span>
                             <span className="text-slate-300 text-xs">/</span>
                             <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${lCode ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`} title="Location code">
                               {lCode || 'No location code'}
                             </span>
                             <span className="text-xs text-slate-500 ml-2">
                               {currentLocation}
                             </span>
                           </div>
                         </div>
                         {hasMissing && (
                           <button
                             onClick={() => setActiveTab('admin')}
                             className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors"
                           >
                             Set codes →
                           </button>
                         )}
                       </div>
                     );
                   })()}

                   {/* Editable Details Grid */}
                   <div className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
                     {/* Vendor */}
                     <div>
                       <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                         <Building2 size={11} /> Vendor
                       </label>
                       <p className="text-sm font-bold text-slate-900 truncate" title={result.vendorName}>
                         {result.vendorName || "Unknown"}
                       </p>
                     </div>

                     {/* Invoice Date */}
                     <div>
                       <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                         <Calendar size={11} /> Date
                       </label>
                       <input
                         type="text"
                         value={result.invoiceDate || ''}
                         onChange={(e) => setResult({...result, invoiceDate: e.target.value})}
                         className="w-full rounded-lg border-slate-200 bg-slate-50/50 shadow-sm focus:border-cyan-400 focus:ring-cyan-400 text-sm py-1.5 px-2.5 font-medium transition-colors"
                         placeholder="YYYY-MM-DD"
                       />
                     </div>

                     {/* Invoice Number */}
                     <div>
                       <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                         <Hash size={11} /> Invoice #
                       </label>
                       <input
                         type="text"
                         value={result.invoiceNumber || ''}
                         onChange={(e) => setResult({...result, invoiceNumber: e.target.value})}
                         className="w-full rounded-lg border-slate-200 bg-slate-50/50 shadow-sm focus:border-cyan-400 focus:ring-cyan-400 text-sm py-1.5 px-2.5 font-medium font-mono transition-colors"
                         placeholder="INV-000"
                       />
                     </div>

                     {/* Total Amount */}
                     <div>
                       <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                         <DollarSign size={11} /> Total
                       </label>
                       <div className="relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                           <span className="text-slate-400 text-sm font-semibold">$</span>
                         </div>
                         <input
                           type="number"
                           step="0.01"
                           value={result.totalAmount === 0 ? '' : result.totalAmount}
                           onChange={(e) => setResult({...result, totalAmount: e.target.value as any})}
                           className="w-full rounded-lg border-slate-200 bg-slate-50/50 pl-6 shadow-sm focus:border-cyan-400 focus:ring-cyan-400 text-sm py-1.5 font-bold font-mono transition-colors"
                           placeholder="0.00"
                         />
                       </div>
                     </div>

                     {/* Items Count */}
                     <div>
                       <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                         <Tag size={11} /> Items
                       </label>
                       <div className="flex items-center h-[34px]">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-100">
                           {result.items.length} line items
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>

                <Dashboard data={result} />
                
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-violet-50 border border-violet-100">
                        <TableProperties size={16} className="text-violet-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 leading-tight">Line Items Review</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Verify GL codes. Click <span className="text-cyan-600 font-semibold">Add to DB</span> to save products for future scans.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {result.items.length} items
                    </span>
                  </div>
                  <InvoiceTable
                    items={result.items}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddToDb={handleOpenAddProduct}
                    glCodes={glCodes}
                  />
                </div>
              </>
            )}
          </div>
        )}
        </motion.div>
        </AnimatePresence>
        </div>
      </main>
      </div>

      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        glCodes={glCodes}
        initialItem={productToAdd}
        onSave={handleSaveProduct}
      />

      {/* ── Widget Drill-Down Panel ── */}
      {widgetDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setWidgetDetail(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {widgetDetail === 'spikes'
                  ? 'Price spikes — last 30 days'
                  : `Invoices — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              </h3>
              <button onClick={() => setWidgetDetail(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-cream-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {widgetDetail === 'spikes' ? (
                widgetStats.spikeDetails.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">No price spikes flagged in the last 30 days.</p>
                ) : (
                  widgetStats.spikeDetails.map(d => (
                    <div key={d.id} className="border border-cream-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-cream-50 border-b border-cream-100">
                        <span className="text-sm font-semibold text-slate-800 truncate">{d.vendorName} · #{d.invoiceNumber}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-3">{d.invoiceDate}</span>
                      </div>
                      <div className="divide-y divide-cream-100">
                        {d.items.map((it, i) => {
                          const pct = it.hist > 0 ? Math.round(((it.unit - it.hist) / it.hist) * 100) : null;
                          const impact = it.hist > 0 && it.unit > it.hist ? (it.unit - it.hist) * it.qty : 0;
                          return (
                            <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-700 truncate">{it.description}</span>
                              <span className="text-xs whitespace-nowrap">
                                {it.hist > 0 && <span className="text-slate-400 line-through mr-1.5">${it.hist.toFixed(2)}</span>}
                                <span className="font-semibold text-slate-900">${it.unit.toFixed(2)}</span>
                                {pct !== null && <span className="ml-2 font-bold text-amber-600">+{pct}%</span>}
                                {impact > 0 && <span className="ml-2 font-semibold text-red-600">+{fmtMoney(impact)}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )
              ) : widgetStats.monthInvoices.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">No invoices saved this month yet.</p>
              ) : (
                <div className="border border-cream-200 rounded-xl overflow-hidden divide-y divide-cream-100">
                  {widgetStats.monthInvoices.map(inv => (
                    <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700 truncate">{inv.vendorName} · #{inv.invoiceNumber}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{inv.invoiceDate}</span>
                      <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{fmtMoney(Number(inv.totalAmount) || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-cream-200 bg-cream-50 flex items-center justify-between text-xs shrink-0">
              {widgetDetail === 'spikes' ? (
                <>
                  <span className="text-slate-500">{widgetStats.spikeItems} spiked item{widgetStats.spikeItems === 1 ? '' : 's'} · {widgetStats.spikeInvoices} invoice{widgetStats.spikeInvoices === 1 ? '' : 's'}</span>
                  <span className="font-bold text-slate-800">Est. impact: {fmtMoney(widgetStats.overcharge)}</span>
                </>
              ) : (
                <>
                  <span className="text-slate-500">{widgetStats.countThis} invoice{widgetStats.countThis === 1 ? '' : 's'} this month</span>
                  <span className="font-bold text-slate-800">Total: {fmtMoney(widgetStats.spendThis)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* ── Floating Action Bar ── */}
      {status === 'complete' && !isSaved && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40"
        >
          <div className="bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.08)]">
            <div className="max-w-[1440px] mx-auto px-5 py-3.5 flex items-center justify-between">
              {/* Left: Summary */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                  <FileText size={14} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">{result?.items.length} items</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100">
                  <DollarSign size={14} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">${(parseFloat(result?.totalAmount as any) || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndFinish}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[13px] font-bold hover:from-emerald-600 hover:to-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
                >
                  <CheckCircle2 size={16} />
                  Finalize & Save
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default App;
