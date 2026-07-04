import React, { useState, useEffect } from 'react';
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
import { saveInvoiceToHistory, checkForDuplicate, getSavedInvoices } from './services/storageService';
import { saveNewProduct } from './services/productService';
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
import { ChefHat, Download, RotateCcw, Save, CheckCircle2, AlertTriangle, AlertCircle, FileText, ExternalLink, LayoutDashboard, TableProperties, MapPin, LogOut, Database, Building2, Calendar, Hash, DollarSign, Tag, CheckCircle, Menu, X, Sparkles, Lock as LockIcon, ShieldCheck } from 'lucide-react';
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
    // Detect invite / password-recovery flow from URL hash.
    // Supabase appends #access_token=...&type=invite|recovery after the link
    // is clicked. We force these users through password setup before app use.
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setMustSetPassword(true);
    }

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

    return () => { subscription.unsubscribe(); };
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
      setRecentInvoices(invoices.slice(0, 5));
    };
    loadRecent();

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

      // Check for price spikes
      const history = await getSavedInvoices();
      const enrichedItems = data.items.map(item => {
        let lastPrice: number | null = null;
        let lastDate: string | null = null;
        // Search history (assuming newest is last, so we search backwards)
        for (let i = history.length - 1; i >= 0; i--) {
          const inv = history[i];
          if (inv.items) {
            const matched = inv.items.find(historyItem => 
              historyItem.description === item.description || 
              (historyItem.productNumber && historyItem.productNumber === item.productNumber)
            );
            if (matched && matched.unitPrice) {
              lastPrice = matched.unitPrice;
              lastDate = inv.invoiceDate;
              break;
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

      // Check for duplicates
      const duplicate = await checkForDuplicate(data);
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
            <div className="inline-flex p-3 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl shadow-xl shadow-cyan-500/20 mb-4">
              <ChefHat size={32} className="text-white" />
            </div>
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

  return (
    <div className="min-h-screen bg-slate-100/60 flex">

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Desktop (always visible) + Mobile (overlay drawer)
          ═══════════════════════════════════════════════════════════ */}

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#0f1629] to-[#1a202c] text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* ── Logo Area ── */}
        <div className="h-[72px] flex items-center justify-between px-5 border-b border-white/[0.06]">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-cyan-400 to-cyan-600 p-2 rounded-xl mr-3 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ChefHat size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">ChefCode<span className="text-cyan-400">.ai</span></h1>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5 tracking-wide">INVOICE INTELLIGENCE</p>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 py-6 px-3 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Main Menu</p>

          <nav className="space-y-1">
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveTab('processor'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                activeTab === 'processor'
                  ? 'bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              {activeTab === 'processor' && (
                <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-sm shadow-cyan-400/50" />
              )}
              <div className={`p-1.5 rounded-lg mr-3 transition-colors ${activeTab === 'processor' ? 'bg-cyan-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
                <LayoutDashboard size={16} />
              </div>
              Invoice Processor
            </motion.button>

            {currentUser === 'admin' && (
              <>
                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveTab('trackers'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                    activeTab === 'trackers'
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {activeTab === 'trackers' && (
                    <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-sm shadow-cyan-400/50" />
                  )}
                  <div className={`p-1.5 rounded-lg mr-3 transition-colors ${activeTab === 'trackers' ? 'bg-cyan-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
                    <TableProperties size={16} />
                  </div>
                  Tracker Sheets
                </motion.button>

                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                    activeTab === 'admin'
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {activeTab === 'admin' && (
                    <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-sm shadow-cyan-400/50" />
                  )}
                  <div className={`p-1.5 rounded-lg mr-3 transition-colors ${activeTab === 'admin' ? 'bg-cyan-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
                    <Database size={16} />
                  </div>
                  Admin Panel
                </motion.button>
              </>
            )}

            {isPlatformAdmin && (
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab('platform'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                  activeTab === 'platform'
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {activeTab === 'platform' && (
                  <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-sm shadow-cyan-400/50" />
                )}
                <div className={`p-1.5 rounded-lg mr-3 transition-colors ${activeTab === 'platform' ? 'bg-cyan-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
                  <ShieldCheck size={16} />
                </div>
                Platform Admin
              </motion.button>
            )}
          </nav>

          {/* ── Location Selector ── */}
          <div className="mt-8">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Active Location</p>
              {locations.length > 0 && (
                <span className="text-[10px] font-medium text-slate-500">
                  {locations.length} {locations.length === 1 ? 'location' : 'locations'}
                </span>
              )}
            </div>
            <div className="flex items-center bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <MapPin size={14} className="mr-2.5 shrink-0 text-cyan-400" />
              {locations.length === 0 ? (
                <span className="text-[13px] font-medium text-slate-500 italic">No locations</span>
              ) : (
                <select
                  value={currentLocation}
                  onChange={handleLocationChange}
                  className="bg-transparent border-none text-[13px] font-medium text-slate-300 focus:ring-0 p-0 cursor-pointer w-full appearance-none"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name} className="bg-[#1a202c] text-white">
                      {loc.name}{loc.location_code ? ` (${loc.location_code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ── User Profile + Sign Out ── */}
        <div className="p-4 border-t border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-cyan-500/20 shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userName || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{userEmail || ''}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
              currentUser === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-cyan-500/15 text-cyan-400'
            }`}>
              {currentUser === 'admin' ? 'Admin' : 'Chef'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-400 bg-white/[0.04] hover:bg-red-500/10 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-all"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT WRAPPER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Trial Banner ── */}
        {org && org.is_trial && trialStatus.status !== 'unknown' && (
          <div className={`flex-shrink-0 px-4 sm:px-6 lg:px-8 py-2 text-xs font-medium flex items-center justify-between gap-3 ${
            trialStatus.status === 'expired'
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              : trialStatus.status === 'ending-soon'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 text-cyan-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={13} className={trialStatus.status === 'active' ? 'text-cyan-600' : 'text-white'} />
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
              className={`whitespace-nowrap font-bold underline hover:no-underline ${trialStatus.status === 'active' ? 'text-cyan-700' : 'text-white'}`}
            >
              Upgrade →
            </a>
          </div>
        )}

        {/* ── Top Header Bar ── */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger — now wired */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

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
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
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
          <div className="max-w-4xl mx-auto mt-6">
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

            {/* ── Hero Header ── */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-200/60 rounded-full px-4 py-1.5 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">AI-Powered Processing</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
                Code Invoices in Seconds
              </h2>
              <p className="mt-3 text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
                Upload supplier invoices from Sysco, US Foods, and more. Our AI extracts every line item and assigns GL codes automatically.
              </p>
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

            {/* ── 3-Step Process Cards ── */}
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { num: '01', title: 'Upload Invoice', desc: 'Drag & drop a PDF or photo of your supplier invoice.', color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50' },
                { num: '02', title: 'AI Analysis', desc: 'Line items extracted, products matched, GL codes assigned.', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' },
                { num: '03', title: 'Review & Export', desc: 'Verify the data and export to CSV, PDF, or QuickBooks.', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="relative bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 group"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} text-white text-sm font-bold shadow-md mb-4`}>
                    {step.num}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>

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
        initialItem={productToAdd}
        onSave={handleSaveProduct}
      />
      
      {/* ── Floating Action Bar ── */}
      {status === 'complete' && !isSaved && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 md:left-72 right-0 z-40"
        >
          <div className="bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.08)]">
            <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between">
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
