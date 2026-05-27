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
import './PagesStyles.css'

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
    <main className="dashboard page-root">
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

      <div className="reports-main-wrap">
        <div className="flex-start-row">
          <button type="button" onClick={() => setIsFilterModalOpen(true)} className="btn-glass-action">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="reports-card">
          <div className="reports-card-header">
            <div className="reports-user-block">
              <div className="reports-avatar">
                <User size={20} className="icon-cyan" />
              </div>
              <div className="reports-user-text">
                <span className="reports-user-name">Name of the User</span>
                <span className="reports-user-meta">Position • Location • Date and Time</span>
              </div>
            </div>
            <div className="badges-row">
              <span className="status-badge">Status</span>
              <span className="day-badge">Day</span>
            </div>
          </div>
          <div className="reports-details-title-wrap"><h4 className="reports-details-title">Details</h4></div>
          
          <div className="reports-workspace">
            <span className="reports-workspace-text">Data Workspace Content Window</span>
            <div onClick={() => setIsUpdateModalOpen(true)} className="edit-icon-container"><SquarePen size={18} /></div>
          </div>
        </div>

        <div className="reports-submit-row">
          <button type="button" onClick={() => setIsModalOpen(true)} className="btn-gradient-primary reports-submit-primary">Submit a Report</button>
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={() => setIsFilterModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-header-row">
              <Filter size={20} className="icon-teal" />
              <h3 className="modal-title-lg">Filter Reports</h3>
            </div>
            <div className="modal-grid">
              <div className="modal-col">
                <div className="modal-grid-2">
                  <div><label className="label-field">Department</label><select className="input-field"><option>Select</option></select></div>
                  <div>
                    <label className="label-field">Date</label>
                    <div className="relative">
                      <input type="text" placeholder="DD-MM/YYYY" className="input-field" />
                      <Calendar size={14} className="icon-abs" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label-field">Status</label>
                  <div className="filter-options-row"><button className="filter-option-button">OPEN</button><button className="filter-option-button">CLOSED</button></div>
                </div>
                <div>
                  <label className="label-field">Severity Level</label>
                  <div className="filter-options-row wrap"><button className="filter-option-button">CRITICAL</button><button className="filter-option-button">MAJOR DEFECTS</button><button className="filter-option-button">MINOR DEFECTS</button></div>
                </div>
              </div>
              <div className="modal-col">
                <div className="filter-options-row"><button className="filter-option-button">QDDR</button><button className="filter-option-button">CAR</button></div>
                <div><label className="label-field">Product Type</label><input type="text" className="input-field" /></div>
                <div><label className="label-field">Cause</label><input type="text" className="input-field" /></div>
              </div>
            </div>
            <div className="modal-actions-center"><button onClick={() => setIsFilterModalOpen(false)} className="btn-gradient-primary">Filter Report</button></div>
          </div>
        </div>
      )}

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button onClick={() => setIsModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <form onSubmit={(e) => e.preventDefault()} className="modal-form">
              <div>
                <label className="label-field">Evidence:</label>
                <div className="upload-box"><UploadIcon size={20} className="icon-teal" /><span className="reports-upload-text">Upload an Image</span></div>
              </div>
              <div className="reports-grid-3-16">
                <div><label className="label-field">Product Type:</label><input type="text" value={productType} onChange={(e) => setProductType(e.target.value)} className="input-field" placeholder="Enter product type" /></div>
                <div><label className="label-field">Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="input-field" placeholder="Enter batch number" /></div>
                <div>
                  <label className="label-field">Location:</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="select-field">
                    <option value="" disabled hidden>Select structural section</option>
                    <option value="station-a">Production Station A</option>
                    <option value="station-b">Production Station B</option>
                    <option value="warehouse">Warehouse Storage</option>
                  </select>
                </div>
              </div>
              <div className="reports-grid-2-16">
                <div>
                  <label className="label-field">Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select-field">
                    <option value="" disabled hidden>Select evaluation risk</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="select-field">
                    <option value="" disabled hidden>Select targeted module block</option>
                    <option value="qa">Quality Assurance</option>
                    <option value="operations">Operations & Assembly</option>
                    <option value="logistics">Logistics & Distribution</option>
                  </select>
                </div>
              </div>
              <div><label className="label-field">Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field textarea-large" placeholder="Provide thorough configuration summary report details..." /></div>
              <div className="modal-badges-row">
                <button type="button" onClick={triggerCarModalTransition} className="badge-button">File for CAR</button>
                <button type="button" onClick={triggerQddrModalTransition} className="badge-button">File for QDDR</button>
              </div>
              <div className="modal-submit-row"><button type="submit" onClick={() => setIsModalOpen(false)} className="btn-gradient-primary">Submit Report</button></div>
            </form>
          </div>
        </div>
      )}

      {/* CAR Modal */}
      {isCarModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={() => setIsCarModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <h3 className="reports-uppercase-title">Corrective Action Report</h3>
            <div className="workspace-placeholder"><span className="reports-placeholder-text">Corrective Actions Configuration Sheet</span><div className="cross-line-bg"></div></div>
            <div className="center-row"><button type="button" onClick={() => setIsCarModalOpen(false)} className="secondary-action-button">Submit Report</button></div>
          </div>
        </div>
      )}

      {/* QDDR Modal */}
      {isQddrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={() => setIsQddrModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <h3 className="reports-uppercase-title">Quality Defects / Damaged / Discrepancy Report</h3>
            <div className="workspace-placeholder"><span className="reports-placeholder-text">Quality Discrepancy Analysis Canvas</span><div className="cross-line-bg"></div></div>
            <div className="center-row"><button type="button" onClick={() => setIsQddrModalOpen(false)} className="secondary-action-button">Submit Report</button></div>
          </div>
        </div>
      )}

      {/* Update Report Modal */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--tall reports-update-card">
            <button onClick={() => setIsUpdateModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-header-row">
              <FileSearch size={18} className="icon-teal" />
              <h3 className="reports-update-title">Update Report</h3>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="modal-form reports-form-compact">
              <div>
                <label className="label-field">Evidence:</label>
                <div className="upload-box upload-box--padded"><UploadIcon size={18} className="icon-teal" /><span className="reports-upload-text-small">Upload an Image</span></div>
              </div>
              <div className="grid-3">
                <div><label className="label-field">Product Type:</label><input type="text" value={productType} onChange={(e) => setProductType(e.target.value)} className="input-field" /></div>
                <div><label className="label-field">Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="input-field" /></div>
                <div>
                  <label className="label-field">Location:</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="select-field">
                    <option value="station-a">Production Station A</option>
                    <option value="station-b">Production Station B</option>
                    <option value="warehouse">Warehouse Storage</option>
                  </select>
                </div>
              </div>
              <div className="reports-grid-2-14">
                <div>
                  <label className="label-field">Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select-field">
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="select-field">
                    <option value="qa">Quality Assurance</option>
                    <option value="operations">Operations & Assembly</option>
                  </select>
                </div>
              </div>
              <div><label className="label-field">Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field textarea-medium" /></div>
              <div><label className="label-field">Investigation:</label><textarea value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} className="input-field textarea-medium" /></div>
              <div className="modal-grid-2">
                <div>
                  <label className="label-field">Resolution Time:</label>
                  <select value={resolutionTime} onChange={(e) => setResolutionTime(e.target.value)} className="select-field">
                    <option value="24h">Within 24 Hours</option>
                    <option value="72h">Within 3 Days</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Verification Date:</label>
                  <div className="relative">
                    <input type="text" value={verificationDate} onChange={(e) => setVerificationDate(e.target.value)} placeholder="DD/MM/YYYY" className="input-field" />
                    <Calendar size={14} className="icon-abs" />
                  </div>
                </div>
              </div>
              <div className="reports-update-submit-row">
                <button type="button" onClick={triggerPreventiveActionTransition} className="btn-gradient-primary reports-update-button">Update Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preventive Action Modal */}
      {isPreventiveActionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card reports-preventive-card">
            <button onClick={() => setIsPreventiveActionModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-body-col">
              <div>
                <label className="label-field">Suggested Preventive Action:</label>
                <div className="workspace-placeholder workspace-placeholder--small">
                  <span className="reports-upload-text-small">Preventive Directives Content Sheet Panel</span>
                  <div className="cross-line-bg"></div>
                </div>
              </div>
              <div className="preventive-panel">
                <span className="label-field label-field--small">Suggested Preventive Action Rating:</span>
                <div className="preventive-options">
                  {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                    <label key={rating} className="preventive-option">
                      <input type="radio" name="preventiveRating" value={rating} checked={preventiveRating === rating} onChange={(e) => setPreventiveRating(e.target.value)} className="radio-accent" />
                      {rating}
                    </label>
                  ))}
                </div>
              </div>
              <div className="reports-preventive-submit-row">
                <button type="button" onClick={() => setIsPreventiveActionModalOpen(false)} className="reports-secondary-muted">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ReportsPage;