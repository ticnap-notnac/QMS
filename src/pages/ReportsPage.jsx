import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { 
  Upload as UploadIcon, 
  X as CloseIcon, 
  SlidersHorizontal,
  SquarePen,
  User,
  Calendar,
  Filter,
  FileSearch
} from 'lucide-react'

function ReportsPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  setIsAdminPanelOpen,      
  setIsAuditToolsOpen,
  setProfileTargetTab
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isQddrModalOpen, setIsQddrModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); 
  const [isPreventiveActionModalOpen, setIsPreventiveActionModalOpen] = useState(false);

  const [productType, setProductType] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [investigationText, setInvestigationText] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [verificationDate, setVerificationDate] = useState('');
  const [preventiveRating, setPreventiveRating] = useState('Excellent');

  const triggerCarModalTransition = () => { setIsModalOpen(false); setIsCarModalOpen(true); };
  const triggerQddrModalTransition = () => { setIsModalOpen(false); setIsQddrModalOpen(true); };
  const triggerPreventiveActionTransition = () => { setIsUpdateModalOpen(false); setIsPreventiveActionModalOpen(true); };

  return (
    <main className="dashboard" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      <div style={{ flex: '1', width: '95%', maxWidth: '1200px', margin: '32px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative', zIndex: '10' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
          <button type="button" onClick={() => setIsFilterModalOpen(true)} style={{ background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', padding: '8px', color: '#22d3ee', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div style={{ width: '100%', background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '12px', padding: '24px', boxSizing: 'border-box', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(6, 182, 212, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} style={{ color: '#22d3ee' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>Name of the User</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Position • Location • Date and Time</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={statusBadgeStyle}>Status</span>
              <span style={dayBadgeStyle}>Day</span>
            </div>
          </div>
          <div style={{ textAlign: 'left', marginBottom: '12px' }}><h4 style={{ margin: '0', fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Details</h4></div>
          
          <div style={{ width: '100%', height: '320px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: '13px', color: '#475569' }}>Data Workspace Content Window</span>
            <div onClick={() => setIsUpdateModalOpen(true)} style={editIconContainerStyle}><SquarePen size={18} /></div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingBottom: '40px' }}>
          <button type="button" onClick={() => setIsModalOpen(true)} style={primaryButtonStyle}>Submit a Report</button>
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsFilterModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: '#f8fafc' }}>
              <Filter size={20} style={{ color: '#06b6d4' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Filter Reports</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={labelStyle}>Department</label><select style={inputStyle}><option>Select</option></select></div>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" placeholder="DD-MM/YYYY" style={inputStyle} />
                      <Calendar size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <div style={{ display: 'flex', gap: '12px' }}><button style={filterOptionButtonStyle}>OPEN</button><button style={filterOptionButtonStyle}>CLOSED</button></div>
                </div>
                <div>
                  <label style={labelStyle}>Severity Level</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}><button style={filterOptionButtonStyle}>CRITICAL</button><button style={filterOptionButtonStyle}>MAJOR DEFECTS</button><button style={filterOptionButtonStyle}>MINOR DEFECTS</button></div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}><button style={filterOptionButtonStyle}>QDDR</button><button style={filterOptionButtonStyle}>CAR</button></div>
                <div><label style={labelStyle}>Product Type</label><input type="text" style={inputStyle} /></div>
                <div><label style={labelStyle}>Cause</label><input type="text" style={inputStyle} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}><button onClick={() => setIsFilterModalOpen(false)} style={primaryButtonStyle}>Filter Report</button></div>
          </div>
        </div>
      )}

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', margin: 0 }}>
              <div>
                <label style={labelStyle}>Evidence:</label>
                <div style={uploadBoxStyle}><UploadIcon size={20} style={{ color: '#06b6d4' }} /><span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '500' }}>Upload an Image</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div><label style={labelStyle}>Product Type:</label><input type="text" value={productType} onChange={(e) => setProductType(e.target.value)} style={inputStyle} placeholder="Enter product type" /></div>
                <div><label style={labelStyle}>Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={inputStyle} placeholder="Enter batch number" /></div>
                <div>
                  <label style={labelStyle}>Location:</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} style={selectStyle}>
                    <option value="" disabled hidden>Select structural section</option>
                    <option value="station-a">Production Station A</option>
                    <option value="station-b">Production Station B</option>
                    <option value="warehouse">Warehouse Storage</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selectStyle}>
                    <option value="" disabled hidden>Select evaluation risk</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} style={selectStyle}>
                    <option value="" disabled hidden>Select targeted module block</option>
                    <option value="qa">Quality Assurance</option>
                    <option value="operations">Operations & Assembly</option>
                    <option value="logistics">Logistics & Distribution</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, height: '120px', padding: '12px', resize: 'none' }} placeholder="Provide thorough configuration summary report details..." /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '4px' }}>
                <button type="button" onClick={triggerCarModalTransition} style={badgeButtonStyle}>File for CAR</button>
                <button type="button" onClick={triggerQddrModalTransition} style={badgeButtonStyle}>File for QDDR</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}><button type="submit" onClick={() => setIsModalOpen(false)} style={primaryButtonStyle}>Submit Report</button></div>
            </form>
          </div>
        </div>
      )}

      {/* CAR Modal */}
      {isCarModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsCarModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: '600', color: '#f8fafc', textAlign: 'left', textTransform: 'uppercase' }}>Corrective Action Report</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Corrective Actions Configuration Sheet</span><div style={crossLineBackgroundStyle}></div></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button type="button" onClick={() => setIsCarModalOpen(false)} style={secondaryActionButtonStyle}>Submit Report</button></div>
          </div>
        </div>
      )}

      {/* QDDR Modal */}
      {isQddrModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsQddrModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: '600', color: '#f8fafc', textAlign: 'left', textTransform: 'uppercase' }}>Quality Defects / Damaged / Discrepancy Report</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Quality Discrepancy Analysis Canvas</span><div style={crossLineBackgroundStyle}></div></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button type="button" onClick={() => setIsQddrModalOpen(false)} style={secondaryActionButtonStyle}>Submit Report</button></div>
          </div>
        </div>
      )}

      {/* Update Report Modal */}
      {isUpdateModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsUpdateModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: '#f8fafc' }}>
              <FileSearch size={18} style={{ color: '#06b6d4' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Update Report</h3>
            </div>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left', margin: 0 }}>
              <div>
                <label style={labelStyle}>Evidence:</label>
                <div style={{ ...uploadBoxStyle, padding: '16px 20px' }}><UploadIcon size={18} style={{ color: '#06b6d4' }} /><span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '500' }}>Upload an Image</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div><label style={labelStyle}>Product Type:</label><input type="text" value={productType} onChange={(e) => setProductType(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Location:</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} style={selectStyle}>
                    <option value="station-a">Production Station A</option>
                    <option value="station-b">Production Station B</option>
                    <option value="warehouse">Warehouse Storage</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selectStyle}>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} style={selectStyle}>
                    <option value="qa">Quality Assurance</option>
                    <option value="operations">Operations & Assembly</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, height: '80px', padding: '10px', resize: 'none' }} /></div>
              <div><label style={labelStyle}>Investigation:</label><textarea value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} style={{ ...inputStyle, height: '80px', padding: '10px', resize: 'none' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Resolution Time:</label>
                  <select value={resolutionTime} onChange={(e) => setResolutionTime(e.target.value)} style={selectStyle}>
                    <option value="24h">Within 24 Hours</option>
                    <option value="72h">Within 3 Days</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Verification Date:</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={verificationDate} onChange={(e) => setVerificationDate(e.target.value)} placeholder="DD/MM/YYYY" style={inputStyle} />
                    <Calendar size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '18px' }}>
                <button type="button" onClick={triggerPreventiveActionTransition} style={{ ...primaryButtonStyle, padding: '12px 52px' }}>Update Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preventive Action Modal */}
      {isPreventiveActionModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '720px' }}>
            <button onClick={() => setIsPreventiveActionModalOpen(false)} style={closeButtonStyle}><CloseIcon size={18} /></button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              <div>
                <label style={labelStyle}>Suggested Preventive Action:</label>
                <div style={{ ...workspacePlaceholderStyle, height: '120px', marginBottom: 0 }}>
                  <span style={{ fontSize: '12px', color: '#475569' }}>Preventive Directives Content Sheet Panel</span>
                  <div style={crossLineBackgroundStyle}></div>
                </div>
              </div>
              <div style={{ background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px' }}>
                <span style={{ ...labelStyle, marginBottom: '16px', fontSize: '13px' }}>Suggested Preventive Action Rating:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                    <label key={rating} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input type="radio" name="preventiveRating" value={rating} checked={preventiveRating === rating} onChange={(e) => setPreventiveRating(e.target.value)} style={{ accentColor: '#06b6d4', width: '15px', height: '15px' }} />
                      {rating}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsPreventiveActionModalOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', padding: '10px 48px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: '999', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4, 9, 20, 0.8)', backdropFilter: 'blur(10px)' };
const modalCardStyle = { width: '90%', maxWidth: '720px', background: 'rgba(13, 26, 45, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '32px', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)', position: 'relative', boxSizing: 'border-box' };
const closeButtonStyle = { position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' };
const inputStyle = { width: '100%', height: '38px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, cursor: 'pointer', colorScheme: 'dark' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px', textAlign: 'left' };
const primaryButtonStyle = { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', color: 'white', padding: '12px 40px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)' };
const filterOptionButtonStyle = { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' };
const statusBadgeStyle = { background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee', fontSize: '12px', fontWeight: '500', padding: '6px 14px', borderRadius: '6px' };
const dayBadgeStyle = { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '12px', fontWeight: '500', padding: '6px 14px', borderRadius: '6px' };
const editIconContainerStyle = { position: 'absolute', right: '16px', bottom: '16px', color: '#06b6d4', cursor: 'pointer', background: 'rgba(13, 26, 45, 0.8)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const uploadBoxStyle = { border: '2px dashed rgba(6, 182, 212, 0.3)', background: 'rgba(8, 18, 35, 0.4)', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '4px' };
const badgeButtonStyle = { background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee', padding: '8px 24px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' };
const workspacePlaceholderStyle = { width: '100%', height: '380px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' };
const crossLineBackgroundStyle = { position: 'absolute', inset: 0, opacity: '0.02', pointerEvents: 'none', background: 'linear-gradient(135deg, transparent 49.5%, #fff 49.5%, #fff 50.5%, transparent 50.5%)' };
const secondaryActionButtonStyle = { background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#e2e8f0', padding: '10px 48px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' };

export default ReportsPage;