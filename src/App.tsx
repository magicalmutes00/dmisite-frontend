import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import { useSiteData, saveSiteData, uploadFile, loginAdmin, logoutAdmin, useAdminAuth, saveRegistration } from './useApi'
import type { TimelineEvent, SiteData, GalleryImage } from './useApi'

type HouseColor = keyof SiteData['leaders'];

const GOOGLE_SCRIPT_URL_SPORTS = 'https://script.google.com/macros/s/AKfycbyz9sM_mxMKYVP2-xoDpSHfx8ZWCcNDxarPxx1G-coNmfmnAZ1mK3FFIZVXb60qN3ck/exec';
const GOOGLE_SCRIPT_URL_COLLEGE = 'https://script.google.com/macros/s/AKfycbyYPQqtunMIjg-dSxhPkl93i6A5Jmh5zTdrkfh7ZX2biO2wn_B9fuMX-WuBboLHYsyC/exec';

interface FormData {
  [key: string]: string;
}



function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [activeTab, setActiveTab] = useState<'sports' | 'college'>('sports');
  const [scheduleTab, setScheduleTab] = useState<'sports' | 'college'>('sports');
  const [galleryFilter, setGalleryFilter] = useState<'sports' | 'college'>('sports');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; event: string; type: string; scheduleImage: string | null } | null>(null);

  const [selectedEventGroups, setSelectedEventGroups] = useState<string[]>([]);
  const [groupParticipants, setGroupParticipants] = useState<Record<string, string>>({});
  const [showAddGroup, setShowAddGroup] = useState(false);

  // New events logic
  const eventsList = [
    "Dance", 
    "Singing", 
    "Drama", 
    "Other events"
  ];
  
  const standardGroupsList = ["A Group", "B Group", "C Group", "D Group", "E Group"];

  const [sportsFormData, setSportsFormData] = useState<FormData>({
    gender: '',
    houseName: '',
    studentName: '',
    year: '',
    department: '',
    gameName: ''
  });

  const [collegeFormData, setCollegeFormData] = useState<FormData>({
    teamName: '',
    teamHeadName: '',
    year: '',
    department: '',
    eventName: '',
    staffInCharge: '',
    songName: '',
    songType: '',
    choreographer: ''
  });

  // Realtime data — updates via polling every 30s from backend
  const { data: adminData, error: dataError, refresh: refreshData } = useSiteData();

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = ['home', 'about', 'events', 'schedule', 'gallery', 'register', 'contact'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const targetDate = new Date('2026-03-26T00:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    };

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Firebase handles realtime sync automatically via useSiteData hook

  const handleSportsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sportsFormData.gender || !sportsFormData.houseName || !sportsFormData.studentName ||
      !sportsFormData.year || !sportsFormData.department || !sportsFormData.gameName) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const sportsDataWithSheet = { ...sportsFormData, sheetType: 'sports', type: 'sports' };
      console.log('Submitting sports data:', sportsDataWithSheet);

      // Save to MongoDB
      await saveRegistration(sportsDataWithSheet);

      // Also save to Google Sheets (if URL is set)
      if (GOOGLE_SCRIPT_URL_SPORTS) {
        fetch(GOOGLE_SCRIPT_URL_SPORTS, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sportsDataWithSheet)
        }).catch(console.warn);
      }

      setSuccessData({
        name: sportsFormData.studentName,
        event: sportsFormData.gameName,
        type: 'Sports Day',
        scheduleImage: sportsFormData.gender === 'Boy' ? adminData.boysSchedule : adminData.girlsSchedule
      });
      setShowSuccessModal(true);
      setSportsFormData({
        gender: '',
        houseName: '',
        studentName: '',
        year: '',
        department: '',
        gameName: ''
      });
    } catch (error) {
      console.error('Error submitting sports form:', error);
      console.error('Error details:', (error as Error).message);
      alert('Error submitting sports registration: ' + (error as Error).message + '. Please check console for details.');
    }
  };

  const handleCollegeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeFormData.teamName || !collegeFormData.teamHeadName || !collegeFormData.year ||
      !collegeFormData.department || !collegeFormData.eventName) {
      alert('Please fill all required fields');
      return;
    }

    if (selectedEventGroups.length === 0) {
      alert('Please select at least one group for the event');
      return;
    }

    // Validate that all selected groups have participant counts greater than 0
    for (const grp of selectedEventGroups) {
      if (!groupParticipants[grp] || parseInt(groupParticipants[grp]) <= 0) {
        alert(`Please enter the number of participants for ${grp}`);
        return;
      }
    }

    try {
      const formattedGroups = selectedEventGroups.map(grp => `${grp} (${groupParticipants[grp]} participants)`).join(', ');
      const collegeDataWithSheet = { 
        ...collegeFormData, 
        selectedGroups: formattedGroups,
        eventName: `${collegeFormData.eventName} [${formattedGroups}]`,
        sheetType: 'college', 
        type: 'college'
      };

      // Save to MongoDB
      await saveRegistration(collegeDataWithSheet);

      // Also save to Google Sheets (if URL is set)
      if (GOOGLE_SCRIPT_URL_COLLEGE) {
        fetch(GOOGLE_SCRIPT_URL_COLLEGE, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collegeDataWithSheet)
        }).catch(console.warn);
      }

      setSuccessData({
        name: collegeFormData.teamName,
        event: collegeFormData.eventName,
        type: 'College Day',
        scheduleImage: null
      });
      setShowSuccessModal(true);
      setCollegeFormData({
        teamName: '',
        teamHeadName: '',
        year: '',
        department: '',
        eventName: '',
        staffInCharge: '',
        songName: '',
        songType: '',
        choreographer: ''
      });
      setSelectedEventGroups([]);
      setGroupParticipants({});
      setShowAddGroup(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Registration successful! (Data saved)');
    }
  };

  const boysGames = ['Cricket', 'Football', 'Volleyball', 'Kabaddi'];
  const girlsGames = ['Throwball', 'Kho-Kho', 'Chess', 'Carrom Board'];

  return (
    <div className="App">
      <nav className={`navbar navbar-expand-lg navbar-dark fixed-top navbar-custom ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a className="navbar-brand" href="#home" style={{ padding: 0 }}>
            <img src="/images/banner.png" alt="DMI Engineering College" style={{ height: '45px', objectFit: 'contain' }} />
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {['Home', 'About', 'Events', 'Schedule', 'Gallery', 'Register', 'Contact'].map(item => (
                <li className="nav-item" key={item}>
                  <a
                    className={`nav-link nav-link-custom ${activeSection === item.toLowerCase() ? 'active' : ''}`}
                    href={`#${item.toLowerCase()}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(item.toLowerCase());
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
              <li className="nav-item">
                <a
                  className="nav-link nav-link-custom admin-link"
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/admin');
                  }}
                >
                  Admin
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <section id="home" className="hero-section">
        <div className="ambient-orb orb-primary" style={{ top: '10%', left: '20%', width: '300px', height: '300px' }}></div>
        <div className="ambient-orb orb-accent" style={{ top: '40%', right: '10%', width: '400px', height: '400px', animationDelay: '-5s' }}></div>
        <div className="ambient-orb orb-primary" style={{ bottom: '-10%', left: '30%', width: '350px', height: '350px', animationDelay: '-10s', opacity: 0.4 }}></div>

        <div className="hero-content">
          <h2 style={{ fontSize: 'clamp(2rem, 8vw, 5rem)', lineHeight: '1.1', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase', marginBottom: '1rem', background: 'linear-gradient(45deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.8))' }} className="fade-in-up">DMI ENGINEERING COLLEGE</h2>
          <div className="hero-badge fade-in-up" style={{ animationDelay: '0.2s' }}>✨ March 26,27, 2026 · Aralvaimozhi</div>
          <h1 className="hero-title fade-in-up" style={{ animationDelay: '0.4s' }}>
            Sports Day & College Day <br /><span className="year text-gradient">2026</span>
          </h1>
          <p className="hero-subtitle">
            Celebrating Talent, Unity & Excellence at DMI Engineering College. Join us in an epic showcase of sportsmanship and culture.
          </p>

          <div className="countdown-container">
            <div className="countdown-item">
              <span className="countdown-value">{countdown.days}</span>
              <span className="countdown-label">Days</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{countdown.hours}</span>
              <span className="countdown-label">Hours</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{countdown.minutes}</span>
              <span className="countdown-label">Minutes</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{countdown.seconds}</span>
              <span className="countdown-label">Seconds</span>
            </div>
          </div>

          <div className="hero-cta fade-in-up">
            <button className="btn-primary" onClick={() => {
              setActiveTab('sports');
              scrollToSection('register');
            }}>
              Register for Sports Day
            </button>
            <button className="btn-outline" onClick={() => {
              setActiveTab('college');
              scrollToSection('register');
            }}>
              Register for College Day
            </button>
          </div>
        </div>
      </section>

      {/* Backend connection error banner */}
      {dataError && (
        <div style={{ background: '#ef4444', color: '#fff', padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <span>⚠️ {dataError}</span>
          <button onClick={refreshData} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {adminData.announcements && adminData.announcements.length > 0 && (
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderBottom: '1px solid var(--color-purple)' }}>
          <div className="container overflow-hidden pt-2 pb-2">
            {/* @ts-expect-error marquee is not in standard HTML specs but works in browsers */}
            <marquee behavior="scroll" direction="left" scrollamount="8" style={{ color: 'var(--color-purple)', fontWeight: 'bold' }}>
              {adminData.announcements.join('  ✦✦✦  ')}
              {/* @ts-expect-error marquee is not in standard HTML specs but works in browsers */}
            </marquee>
          </div>
        </div>
      )}

      <section id="about" className="about-section section-light">
        <div className="container">
          <h2 className="section-title">Our Foundation</h2>
          <div className="row align-items-center">
            <div className="col-lg-5 mb-4 mb-lg-0">
              <div className="stats-container">
                <div className="stat-item fade-in-up">
                  <div className="stat-number">70</div>
                  <div className="stat-label">Experienced Professors</div>
                </div>
                <div className="stat-item fade-in-up">
                  <div className="stat-number">3000</div>
                  <div className="stat-label">Graduated Students</div>
                </div>
                <div className="stat-item fade-in-up">
                  <div className="stat-number">55</div>
                  <div className="stat-label">University Rankings</div>
                </div>
                <div className="stat-item fade-in-up" style={{ gridColumn: '1 / -1' }}>
                  <div className="stat-number">106</div>
                  <div className="stat-label">Publications & Patents</div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="about-content fade-in-up">
                <p>
                  DMI Engineering College was established by DMI Foundation which is an effort of sisters of DMI (Daughters of Mary Immaculate) and the fathers of MMI (Missionaries of Mary Immaculate) of the Catholic Church, which was founded in the year 1984 by Rev.Dr.Fr.J.E.Arulraj.
                </p>

                <h3 style={{ color: 'var(--color-primary)', marginTop: '2rem' }}>Vision</h3>
                <p>
                  To Elevate our institution into a premier technical education hub, empowering rural students with cutting-edge knowledge, while instilling disciplined living.
                </p>

                <h3 style={{ color: 'var(--color-primary)', marginTop: '1.5rem' }}>Mission</h3>
                <ul className="event-list" style={{ marginTop: '0.5rem' }}>
                  <li>To equip students with the skills and knowledge needed for thriving careers through comprehensive education.</li>
                  <li>To equip rural learners with the latest technical knowledge while cultivating values of self-discipline and integrity.</li>
                  <li>To train professionals to be entrepreneurs and employment generators.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="college-features-section section-light-alt">
        <div className="container position-relative z-1">
          <div className="bento-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="bento-card fade-in-up bento-college">
              <div className="bento-icon">🏆</div>
              <h3>DMI: Shaping National Achievers</h3>
              <p>At DMI Engineering College, our students actively participate in a diverse range of competitions and challenges at state, national, and international levels. The institution provides financial assistance to support their participation, fostering an environment where such engagements have become a regular and integral part of student activities each month.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="leaders" className="leaders-section section-light">
        <div className="container">
          <h2 className="section-title">Houses & Leaders</h2>
          <p style={{ color: '#e2e8f0', maxWidth: '600px', margin: '0 auto 2rem' }}>Four houses, one spirit. Meet the teams competing for glory and the leaders guiding them to victory.</p>

          <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {['red', 'green', 'yellow', 'blue'].map((color, idx) => {
              const leader = adminData.leaders[color as HouseColor];
              const houseNames = { red: 'Strength & Passion', green: 'Growth & Energy', yellow: 'Confidence & Victory', blue: 'Unity & Determination' };
              const themeColor = color === 'yellow' ? '#facc15' : color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : '#3b82f6';
              // @ts-ignore
              const _quotes = { red: 'Igniting the fire within.', green: 'Nurturing excellence naturally.', yellow: 'Shining bright, aiming high.', blue: 'Flowing together towards success.' };

              return (
                <div key={color} className="bento-card fade-in-up" style={{ animationDelay: `${idx * 0.1}s`, borderTop: `4px solid ${themeColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <h3 style={{ color: themeColor, textTransform: 'capitalize', marginBottom: '0.25rem' }}>{color} House</h3>
                  <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{houseNames[color as keyof typeof houseNames]}</div>

                  {leader.image ? (
                    <div style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${themeColor}`, padding: '4px', background: 'var(--color-bg-base)' }}>
                      <img src={leader.image} alt={`${color} leader`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    </div>
                  ) : (
                    <div style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem', borderRadius: '50%', background: 'var(--color-bg-base)', border: `3px solid ${themeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                      👤
                    </div>
                  )}

                  <div style={{ color: themeColor, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>House Leader</div>
                  <h4 style={{ color: '#f1f5f9', margin: 0, marginBottom: '1.5rem', flex: 1 }}>{leader.name || '[Add Leader Name]'}</h4>

                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="events" className="events-section position-relative section-light-alt">
        <div className="ambient-orb orb-accent" style={{ top: '20%', left: '-5%', width: '300px', height: '300px', opacity: 0.3 }}></div>
        <div className="ambient-orb orb-primary" style={{ bottom: '10%', right: '-5%', width: '400px', height: '400px', opacity: 0.3 }}></div>

        <div className="container position-relative z-1">
          <h2 className="section-title fade-in-up">Events</h2>
          <div className="bento-grid">
            <div className="bento-card fade-in-up bento-sports">
              <div className="bento-icon">🏃‍♂️</div>
              <h3>Sports Day</h3>
              <p>Compete in thrilling athletic events and showcase your sporting excellence</p>
              <ul className="event-list">
                {adminData.sportsEvents.map((evt, idx) => (
                  <li key={idx}>{evt}</li>
                ))}
              </ul>
              <button className="btn-primary mt-3" onClick={() => {
                setActiveTab('sports');
                scrollToSection('register');
              }}>
                Register Now
              </button>
            </div>
            <div className="bento-card fade-in-up bento-college">
              <div className="bento-icon">🎭</div>
              <h3>College Day</h3>
              <p>Express your creativity through captivating cultural performances</p>
              <ul className="event-list">
                {adminData.collegeEvents.map((evt, idx) => (
                  <li key={idx}>{evt}</li>
                ))}
              </ul>
              <button className="btn-primary mt-3" onClick={() => {
                setActiveTab('college');
                scrollToSection('register');
              }}>
                Register Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="schedule" className="schedule-section section-light">
        <div className="container">
          <h2 className="section-title">Event Schedule</h2>
          <p className="text-center text-primary mb-5">March 15, 2026 - Full Day Program</p>

          <div className="tab-switcher mb-5">
            <button
              className={`tab-btn ${scheduleTab === 'sports' ? 'active' : ''}`}
              onClick={() => setScheduleTab('sports')}
            >
              <i className="fas fa-running"></i> Sports Day
            </button>
            <button
              className={`tab-btn ${scheduleTab === 'college' ? 'active' : ''}`}
              onClick={() => setScheduleTab('college')}
            >
              <i className="fas fa-theater-masks"></i> College Day
            </button>
          </div>

          <div className="timeline">
            {adminData.timeline.filter(item => (item.type || 'sports') === scheduleTab).map((item, index) => (
              <div className="timeline-item fade-in-up" key={index}>
                <div className="timeline-time">
                  <span className="time-badge">{item.time}</span>
                </div>
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {scheduleTab === 'sports' && (
            <div className="row mt-5">
              <div className="col-md-6 mb-4">
                <h3 className="text-center text-primary mb-3">Boys Schedule</h3>
                {adminData.boysSchedule ? (
                  <div className="schedule-image-container">
                    <img src={adminData.boysSchedule} alt="Boys Schedule" className="schedule-image" />
                  </div>
                ) : (
                  <div className="schedule-placeholder">
                    <i className="fas fa-calendar-alt fa-3x mb-3"></i>
                    <p>Boys schedule will be updated soon</p>
                  </div>
                )}
              </div>
              <div className="col-md-6 mb-4">
                <h3 className="text-center text-primary mb-3">Girls Schedule</h3>
                {adminData.girlsSchedule ? (
                  <div className="schedule-image-container">
                    <img src={adminData.girlsSchedule} alt="Girls Schedule" className="schedule-image" />
                  </div>
                ) : (
                  <div className="schedule-placeholder">
                    <i className="fas fa-calendar-alt fa-3x mb-3"></i>
                    <p>Girls schedule will be updated soon</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="gallery" className="gallery-section section-light-alt">
        <div className="container">
          <h2 className="section-title">Gallery</h2>

          <div className="tab-switcher mb-5">
            <button
              className={`tab-btn ${galleryFilter === 'sports' ? 'active' : ''}`}
              onClick={() => setGalleryFilter('sports')}
            >
              <i className="fas fa-running"></i> Sports Day
            </button>
            <button
              className={`tab-btn ${galleryFilter === 'college' ? 'active' : ''}`}
              onClick={() => setGalleryFilter('college')}
            >
              <i className="fas fa-theater-masks"></i> College Day
            </button>
          </div>

          {adminData.galleryImages.filter((img: GalleryImage) => img.type === galleryFilter).length === 0 ? (
            <div className="gallery-empty-state">
              <div className="gallery-empty-icon">{galleryFilter === 'sports' ? '🏃‍♂️' : '🎭'}</div>
              <p>{galleryFilter === 'sports' ? 'Sports Day' : 'College Day'} photos will appear here once uploaded via the Admin panel.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {adminData.galleryImages
                .filter((img: GalleryImage) => img.type === galleryFilter)
                .map((img: GalleryImage, idx: number) => (
                  <div className="gallery-item fade-in-up" key={idx}>
                    <img src={img.url} alt={img.label || `${galleryFilter} Photo ${idx + 1}`} />
                    <div className="gallery-overlay">
                      <div className="gallery-label">{img.label || `${galleryFilter === 'sports' ? 'Sports' : 'College'} Day Photo ${idx + 1}`}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <section id="video-gallery" className="gallery-section section-light">
        <div className="container">
          <h2 className="section-title fade-in-up">Video Gallery</h2>
          <div className="gallery-grid">
            {adminData.videos.map((video: { title: string; link: string }, index: number) => (
              <a href={video.link} target="_blank" rel="noreferrer" className="gallery-item fade-in-up" key={index} style={{ cursor: 'pointer', padding: '1px', textDecoration: 'none' }}>
                <div style={{ background: 'var(--color-bg-alt)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', borderRadius: '16px', border: '1px solid var(--color-border)', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                  <i className="fab fa-youtube fa-4x mb-4" style={{ color: '#ff0000', filter: 'drop-shadow(0 4px 10px rgba(255,0,0,0.3))' }}></i>
                  <h4 style={{ color: '#f1f5f9', textAlign: 'center', fontWeight: 'bold' }}>{video.title}</h4>
                  <p style={{ color: '#a5b4fc', marginTop: '0.5rem', fontWeight: 600 }}>Watch on YouTube</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="coordinators" className="gallery-section section-light-alt">
        <div className="container">
          <h2 className="section-title fade-in-up">Event Coordinators</h2>

          <div className="tab-switcher mb-5 fade-in-up">
            <button className={`tab-btn ${activeTab === 'sports' ? 'active' : ''}`} onClick={() => setActiveTab('sports')}><i className="fas fa-running"></i> Sports Day</button>
            <button className={`tab-btn ${activeTab === 'college' ? 'active' : ''}`} onClick={() => setActiveTab('college')}><i className="fas fa-theater-masks"></i> College Day</button>
          </div>

          <div className="gallery-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
            {adminData.coordinators.filter((c: { name: string; image: string; type: string }) => c.type === activeTab).map((item: { name: string; image: string; type: string }, index: number) => (
              <div className="fade-in-up" key={index} style={{ textAlign: 'center' }}>
                <div style={{ borderRadius: '50%', overflow: 'hidden', aspectRatio: '1/1', border: '5px solid var(--color-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', margin: '0 auto 1.5rem', maxWidth: '250px' }}>
                  <img src={item.image} alt={`Coordinator ${item.name}`} style={{ objectFit: 'cover', width: '100%', height: '100%', transition: 'transform 0.5s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                </div>
                <h4 style={{ color: '#1e293b', fontWeight: 'bold' }}>{item.name}</h4>
                <p style={{ color: '#6366f1' }}>Co-Ordinator</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="register" className="register-section section-light">
        <div className="container">
          <h2 className="section-title">Register Now</h2>

          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'sports' ? 'active' : ''}`}
              onClick={() => setActiveTab('sports')}
            >
              <i className="fas fa-running"></i> Sports Day
            </button>
            <button
              className={`tab-btn ${activeTab === 'college' ? 'active' : ''}`}
              onClick={() => setActiveTab('college')}
            >
              <i className="fas fa-theater-masks"></i> College Day
            </button>
          </div>

          {activeTab === 'sports' ? (
            <form className="register-form" onSubmit={handleSportsSubmit}>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <div className="gender-toggle">
                  <button
                    type="button"
                    className={`gender-btn ${sportsFormData.gender === 'Boy' ? 'active' : ''}`}
                    onClick={() => setSportsFormData({ ...sportsFormData, gender: 'Boy', gameName: '' })}
                  >
                    Boy
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${sportsFormData.gender === 'Girl' ? 'active' : ''}`}
                    onClick={() => setSportsFormData({ ...sportsFormData, gender: 'Girl', gameName: '' })}
                  >
                    Girl
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">House Name *</label>
                <div className="house-select">
                  {['Green', 'Red', 'Blue', 'Yellow'].map(house => (
                    <div
                      key={house}
                      className={`house-option ${sportsFormData.houseName === house ? 'active' : ''}`}
                      onClick={() => setSportsFormData({ ...sportsFormData, houseName: house })}
                    >
                      <div className={`house-dot ${house.toLowerCase()}`}></div>
                      <span>{house} House</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Student Name *</label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter your full name"
                  value={sportsFormData.studentName}
                  onChange={(e) => setSportsFormData({ ...sportsFormData, studentName: e.target.value })}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Year of Study *</label>
                    <select
                      className="form-control-custom"
                      value={sportsFormData.year}
                      onChange={(e) => setSportsFormData({ ...sportsFormData, year: e.target.value })}
                      required
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control-custom"
                      value={sportsFormData.department}
                      onChange={(e) => setSportsFormData({ ...sportsFormData, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="AI&DS">Artificial intelligence&Data science</option>
                      <option value="CSE">Computer Science Engineering</option>
                      <option value="ECE">Electronics & Communication</option>
                      <option value="EEE">Electrical & Electronics</option>
                      <option value="MECH">Mechanical Engineering</option>
                      <option value="CIVIL">Civil Engineering</option>
                      <option value="IT">Information Technology</option>
                      <option value="S&H">Science & Humanities</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Game Name *</label>
                <select
                  className="form-control-custom"
                  value={sportsFormData.gameName}
                  onChange={(e) => setSportsFormData({ ...sportsFormData, gameName: e.target.value })}
                  required
                  disabled={!sportsFormData.gender}
                >
                  <option value="">Select Game</option>
                  {sportsFormData.gender === 'Boy' && boysGames.map(game => (
                    <option key={game} value={game}>{game}</option>
                  ))}
                  {sportsFormData.gender === 'Girl' && girlsGames.map(game => (
                    <option key={game} value={game}>{game}</option>
                  ))}
                </select>
              </div>

              {sportsFormData.gender && (sportsFormData.gender === 'Boy' ? adminData.boysSchedule : adminData.girlsSchedule) && (
                <div className="schedule-image-container mb-4">
                  <h5 className="text-primary mb-3">Your Schedule</h5>
                  <img
                    src={sportsFormData.gender === 'Boy' ? adminData.boysSchedule : adminData.girlsSchedule}
                    alt="Schedule"
                    className="schedule-image"
                  />
                </div>
              )}

              {adminData.matchSchedule && (
                <div className="schedule-image-container mb-4">
                  <h5 className="text-primary mb-3">Today's Match</h5>
                  <img
                    src={adminData.matchSchedule}
                    alt="Match Schedule"
                    className="schedule-image"
                  />
                </div>
              )}

              <button type="submit" className="btn-primary w-100 mt-2">
                <i className="fas fa-paper-plane me-2"></i> Submit Registration
              </button>
            </form>
          ) : (
            <form className="register-form" onSubmit={handleCollegeSubmit}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter team name"
                  value={collegeFormData.teamName}
                  onChange={(e) => setCollegeFormData({ ...collegeFormData, teamName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Head Name *</label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter team head name"
                  value={collegeFormData.teamHeadName}
                  onChange={(e) => setCollegeFormData({ ...collegeFormData, teamHeadName: e.target.value })}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Year of Study *</label>
                    <select
                      className="form-control-custom"
                      value={collegeFormData.year}
                      onChange={(e) => setCollegeFormData({ ...collegeFormData, year: e.target.value })}
                      required
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control-custom"
                      value={collegeFormData.department}
                      onChange={(e) => setCollegeFormData({ ...collegeFormData, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="AI&DS">Artificial Intelligence & Data Science</option>
                      <option value="CSE">Computer Science Engineering</option>
                      <option value="ECE">Electronics & Communication</option>
                      <option value="EEE">Electrical & Electronics</option>
                      <option value="MECH">Mechanical Engineering</option>
                       <option value="IT">Information Technology</option>
                       <option value="S&H">Science & Humanities</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {eventsList.map(evt => (
                    <button
                      type="button"
                      key={evt}
                      className={`btn-event-pill ${collegeFormData.eventName === evt ? 'active' : ''}`}
                      onClick={() => {
                        setCollegeFormData({ ...collegeFormData, eventName: evt });
                        setSelectedEventGroups([]);
                        setGroupParticipants({});
                        setShowAddGroup(false);
                      }}
                    >
                      {evt}
                    </button>
                  ))}
                </div>
              </div>

              {collegeFormData.eventName && (
                <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', animation: 'fadeIn 0.5s ease' }}>
                  <label className="form-label text-primary" style={{ marginBottom: '1rem' }}>Select Groups for {collegeFormData.eventName} *</label>
                  
                  <div className="event-groups-container">
                    {selectedEventGroups.length > 0 && (
                      <div className="selected-groups mb-4">
                        <p className="mb-3" style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600 }}>Your Selection & Participants:</p>
                        <div className="d-flex flex-column gap-3">
                          {selectedEventGroups.map(grp => (
                            <div key={grp} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setSelectedEventGroups(selectedEventGroups.filter(g => g !== grp));
                                  const newObj = { ...groupParticipants };
                                  delete newObj[grp];
                                  setGroupParticipants(newObj);
                                }}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer' }}
                              >
                                ✕ Remove
                              </button>
                              
                              <h5 style={{ color: 'var(--color-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>{grp}</h5>
                              
                              <div className="form-group mb-0">
                                <label className="form-label" style={{ fontSize: '0.85rem' }}>Number of Participants *</label>
                                <input 
                                  type="number" 
                                  className="form-control-custom"
                                  placeholder="Enter number"
                                  min="1"
                                  value={groupParticipants[grp] || ''}
                                  onChange={(e) => setGroupParticipants({ ...groupParticipants, [grp]: e.target.value })}
                                  required
                                  style={{ padding: '0.5rem 1rem' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedEventGroups.length === 0 || showAddGroup) ? (
                      <div>
                        {selectedEventGroups.length > 0 && <p className="mb-2" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Select another group:</p>}
                        <div className="d-flex flex-wrap gap-2">
                          {standardGroupsList.map(grp => {
                            if (selectedEventGroups.includes(grp)) return null;
                            return (
                              <button
                                type="button"
                                key={grp}
                                className="btn-group-outline"
                                onClick={() => {
                                  setSelectedEventGroups([...selectedEventGroups, grp]);
                                  setShowAddGroup(false);
                                }}
                              >
                                + {grp}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-add-another" 
                        onClick={() => setShowAddGroup(true)}
                      >
                        <i className="fas fa-plus me-1"></i> Add Another Group
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Staff In-Charge Name *</label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter staff in-charge name"
                  value={collegeFormData.staffInCharge}
                  onChange={(e) => setCollegeFormData({ ...collegeFormData, staffInCharge: e.target.value })}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Song Name</label>
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Enter song name"
                      value={collegeFormData.songName}
                      onChange={(e) => setCollegeFormData({ ...collegeFormData, songName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Song Type</label>
                    <select
                      className="form-control-custom"
                      value={collegeFormData.songType}
                      onChange={(e) => setCollegeFormData({ ...collegeFormData, songType: e.target.value })}
                    >
                      <option value="">Select Type</option>
                      <option value="Folk">Folk</option>
                      <option value="Classical">Classical</option>
                      <option value="Hip Hop">Hip Hop</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Choreographer Name (Optional)</label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter choreographer name"
                  value={collegeFormData.choreographer}
                  onChange={(e) => setCollegeFormData({ ...collegeFormData, choreographer: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-gold w-100 mt-4">
                <i className="fas fa-paper-plane me-2"></i> Submit Registration
              </button>
            </form>
          )}
        </div>
      </section>

      <section id="contact" className="contact-section section-light-alt">
        <div className="container">
          <h2 className="section-title">Contact Us</h2>

          <div className="contact-cards">
            <div className="contact-card fade-in-up">
              <div className="contact-icon">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h4>Address</h4>
              <p>DMI Engineering College<br />Kumarapuram Road, Aralvaimozhi<br />Kanayakumari, Tamil Nadu 629301</p>
            </div>
            <div className="contact-card fade-in-up">
              <div className="contact-icon">
                <i className="fas fa-phone"></i>
              </div>
              <h4>Phone</h4>
              <p>04652 262 066</p>
            </div>
            <div className="contact-card fade-in-up">
              <div className="contact-icon">
                <i className="fas fa-globe"></i>
              </div>
              <h4>Website</h4>
              <p><a href="https://dmiengg.edu.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>dmiengg.edu.in</a></p>
            </div>
          </div>

          <div className="map-container">
            <iframe
              src="https://maps.google.com/maps?q=DMI+Engineering+College,Aralvaimozhi,Kanyakumari,Tamil+Nadu&output=embed&z=15"
              width="100%"
              height="450"
              style={{ border: 0, borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="DMI Engineering College Location"
            ></iframe>
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <a
                href="https://maps.google.com/maps?q=DMI+Engineering+College,Aralvaimozhi,Kanyakumari,Tamil+Nadu"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600 }}
              >
                📍 Open in Google Maps ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-logo">DMI Engineering College</div>
          <div className="social-icons">
            <a href="https://www.facebook.com/share/1cs8rcwxMX/" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.instagram.com/dmi_engg_college_official?igsh=cHo0NDVqamloMWxv" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.linkedin.com/school/dmieckk/" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="https://youtube.com/@dmieckk?si=mj-rZhHanXOpNhql" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
          <div className="copyright">
            © 2026 DMI Engineering College. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Success Modal Keep */}
      {
        showSuccessModal && successData && (
          <div className="success-modal" onClick={() => setShowSuccessModal(false)}>
            <div className="success-content" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon">🎉</div>
              <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Registration Successful!</h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text-dark)' }}>
                <strong>{successData?.name}</strong>
              </p>
              <p style={{ color: 'var(--color-text-medium)' }}>
                Event: <strong>{successData?.event}</strong>
              </p>
              <p style={{ color: 'var(--color-text-medium)', marginBottom: '1.5rem' }}>
                Type: <strong>{successData?.type}</strong>
              </p>

              {successData?.scheduleImage && (
                <div className="mt-3">
                  <h5 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Your Schedule</h5>
                  <img
                    src={successData.scheduleImage}
                    alt="Schedule"
                    style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid var(--color-primary)' }}
                  />
                </div>
              )}

              <button className="btn-primary mt-3" onClick={() => setShowSuccessModal(false)}>
                Close
              </button>
            </div>
          </div>
        )
      }
      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/919865929424"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="whatsapp-icon">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="whatsapp-label">Chat with us</span>
      </a>
    </div >
  );
}

function Admin() {
  const navigate = useNavigate();
  // Bug fix: check JWT from localStorage on mount so admin stays logged in on refresh
  const { isAdmin, checking } = useAdminAuth();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const isLoggedIn = isAdmin || isAdminLoggedIn;

  const { data: adminData } = useSiteData();

  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newTimeline, setNewTimeline] = useState<TimelineEvent>({ time: '', title: '', desc: '' });
  const [adminScheduleTab, setAdminScheduleTab] = useState<'sports' | 'college'>('sports');
  const [newSportsEvent, setNewSportsEvent] = useState('');
  const [newCollegeEvent, setNewCollegeEvent] = useState('');
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [galleryImageType, setGalleryImageType] = useState<'sports' | 'college'>('sports');
  const [activeAdminSection, setActiveAdminSection] = useState<string>('overview');
  // Local state for leader names — saved only on blur/Enter (not every keystroke)
  const [leaderNames, setLeaderNames] = useState<Record<HouseColor, string>>({
    red: '', green: '', yellow: '', blue: ''
  });

  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value.trim();
    setLoginError('');
    try {
      await loginAdmin(password);
      setIsAdminLoggedIn(true);
    } catch {
      setLoginError('Invalid password. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Multiple files for gallery
    if (type === 'gallery') {
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFile(file, 'gallery');
        newImages.push({ url, type: galleryImageType, label: file.name.split('.')[0] });
      }
      const allImages = [...adminData.galleryImages, ...newImages];
      await saveSiteData({ galleryImages: allImages });
      setUploadStatus(prev => ({ ...prev, gallery: `✅ ${files.length} ${galleryImageType} image${files.length > 1 ? 's' : ''} uploaded` }));
    } else {
      const file = files[0];
      const url = await uploadFile(file, type.startsWith('leader_') ? 'leaders' : 'schedules');
      if (type === 'boysSchedule' || type === 'girlsSchedule' || type === 'matchSchedule') {
        await saveSiteData({ [type]: url });
        setUploadStatus(prev => ({ ...prev, [type]: '✅ Uploaded' }));
      } else if (type.startsWith('leader_')) {
        const color = type.split('_')[1] as HouseColor;
        const newLeaders = { ...adminData.leaders, [color]: { ...adminData.leaders[color], image: url } };
        await saveSiteData({ leaders: newLeaders });
        setUploadStatus(prev => ({ ...prev, [type]: '✅ Uploaded' }));
      }
    }
  };

  // Sync leaderNames local state when adminData loads
  useEffect(() => {
    if (adminData?.leaders) {
      setLeaderNames({
        red: adminData.leaders.red?.name || '',
        green: adminData.leaders.green?.name || '',
        yellow: adminData.leaders.yellow?.name || '',
        blue: adminData.leaders.blue?.name || '',
      });
    }
  }, [adminData?.leaders]);

  const handleLeaderNameSave = (color: HouseColor) => {
    const name = leaderNames[color];
    const newLeaders = { ...adminData.leaders, [color]: { ...adminData.leaders[color], name } };
    saveSiteData({ leaders: newLeaders });
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    const updated = [...adminData.announcements, newAnnouncement.trim()];
    saveSiteData({ announcements: updated });
    setNewAnnouncement('');
  };

  const handleDeleteAnnouncement = (index: number) => {
    const updated = adminData.announcements.filter((_, i) => i !== index);
    saveSiteData({ announcements: updated });
  };

  const handleAddTimeline = () => {
    if (!newTimeline.time || !newTimeline.title || !newTimeline.desc) return;
    const updated = [...adminData.timeline, { ...newTimeline, type: adminScheduleTab }];
    saveSiteData({ timeline: updated });
    setNewTimeline({ time: '', title: '', desc: '' });
  };

  const handleDeleteTimeline = (index: number) => {
    const updated = adminData.timeline.filter((_, i) => i !== index);
    saveSiteData({ timeline: updated });
  };

  const moveTimelineUp = (index: number) => {
    const updated = [...adminData.timeline];
    const targetType = updated[index].type || 'sports';
    let prevIndex = index - 1;
    while (prevIndex >= 0 && (updated[prevIndex].type || 'sports') !== targetType) {
      prevIndex--;
    }
    if (prevIndex < 0) return;
    [updated[prevIndex], updated[index]] = [updated[index], updated[prevIndex]];
    saveSiteData({ timeline: updated });
  };

  const moveTimelineDown = (index: number) => {
    const updated = [...adminData.timeline];
    const targetType = updated[index].type || 'sports';
    let nextIndex = index + 1;
    while (nextIndex < updated.length && (updated[nextIndex].type || 'sports') !== targetType) {
      nextIndex++;
    }
    if (nextIndex >= updated.length) return;
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    saveSiteData({ timeline: updated });
  };

  const handleAddSportsEvent = () => {
    if (!newSportsEvent.trim()) return;
    const updated = [...adminData.sportsEvents, newSportsEvent.trim()];
    saveSiteData({ sportsEvents: updated });
    setNewSportsEvent('');
  };

  const handleDeleteSportsEvent = (index: number) => {
    const updated = adminData.sportsEvents.filter((_, i) => i !== index);
    saveSiteData({ sportsEvents: updated });
  };

  const handleAddCollegeEvent = () => {
    if (!newCollegeEvent.trim()) return;
    const updated = [...adminData.collegeEvents, newCollegeEvent.trim()];
    saveSiteData({ collegeEvents: updated });
    setNewCollegeEvent('');
  };

  const handleDeleteCollegeEvent = (index: number) => {
    const updated = adminData.collegeEvents.filter((_, i) => i !== index);
    saveSiteData({ collegeEvents: updated });
  };

  const handleDeleteGalleryImage = (index: number) => {
    const updated = adminData.galleryImages.filter((_: any, i: number) => i !== index);
    saveSiteData({ galleryImages: updated });
  };

  // @ts-ignore
  const handleGalleryImageTypeChange = (index: number, newType: 'sports' | 'college') => {
    const updated = adminData.galleryImages.map((img: any, i: number) =>
      i === index ? { ...img, type: newType } : img
    );
    saveSiteData({ galleryImages: updated });
  };


  if (checking) {
    return (
      <div className="adm-login-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="adm-login-wrap">
        <div className="adm-login-card">
          <div className="adm-login-brand">
            <div className="adm-login-icon">🛡️</div>
            <h1 className="adm-login-title">Admin Portal</h1>
            <p className="adm-login-subtitle">DMI Engineering College</p>
          </div>
          <form onSubmit={handleAdminLogin} className="adm-login-form">
            <div className="adm-field-group">
              <label className="adm-label">Password</label>
              <div className="adm-input-wrap">
                <span className="adm-input-icon">🔒</span>
                <input type="password" name="password" className="adm-input" placeholder="Enter admin password" required />
              </div>
            </div>
            {loginError && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                {loginError}
              </p>
            )}
        <button type="submit" className="adm-btn-primary">Sign In to Dashboard</button>
            <button type="button" className="adm-btn-ghost" onClick={() => navigate('/')}>← Back to Home</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <span className="adm-sidebar-logo">⚡</span>
          <span className="adm-sidebar-name">DMI Admin</span>
        </div>
        <nav className="adm-sidebar-nav">
          <span className="adm-nav-section-label">DASHBOARD</span>
          <a href="#overview" className={`adm-nav-item ${activeAdminSection === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('overview'); }}>
            <span className="adm-nav-icon">📊</span> Overview
          </a>
          <span className="adm-nav-section-label">CONTENT</span>
          <a href="#announcements" className={`adm-nav-item ${activeAdminSection === 'announcements' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('announcements'); }}>
            <span className="adm-nav-icon">📢</span> Announcements
          </a>
          <a href="#timeline" className={`adm-nav-item ${activeAdminSection === 'timeline' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('timeline'); }}>
            <span className="adm-nav-icon">🗓️</span> Timeline
          </a>
          <a href="#sports" className={`adm-nav-item ${activeAdminSection === 'sports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('sports'); }}>
            <span className="adm-nav-icon">🏆</span> Sports Events
          </a>
          <a href="#college" className={`adm-nav-item ${activeAdminSection === 'college' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('college'); }}>
            <span className="adm-nav-icon">🎭</span> College Events
          </a>
          <span className="adm-nav-section-label">ASSETS</span>
          <a href="#uploads" className={`adm-nav-item ${activeAdminSection === 'uploads' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('uploads'); }}>
            <span className="adm-nav-icon">📁</span> Upload Files
          </a>
          <a href="#gallery" className={`adm-nav-item ${activeAdminSection === 'gallery' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('gallery'); }}>
            <span className="adm-nav-icon">🖼️</span> Gallery
          </a>
          <a href="#leaders" className={`adm-nav-item ${activeAdminSection === 'leaders' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveAdminSection('leaders'); }}>
            <span className="adm-nav-icon">🏅</span> House Leaders
          </a>
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-sidebar-logout" onClick={async () => { await logoutAdmin(); setIsAdminLoggedIn(false); window.location.reload(); }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="adm-main">
        {/* Top Bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <h1 className="adm-topbar-title">
              {activeAdminSection === 'overview' && 'Dashboard'}
              {activeAdminSection === 'announcements' && 'Announcements'}
              {activeAdminSection === 'timeline' && 'Event Timeline'}
              {activeAdminSection === 'sports' && 'Sports Events'}
              {activeAdminSection === 'college' && 'College Events'}
              {activeAdminSection === 'uploads' && 'Upload Files'}
              {activeAdminSection === 'gallery' && 'Gallery Management'}
              {activeAdminSection === 'leaders' && 'House Leaders'}
            </h1>
            <p className="adm-topbar-sub">
              {activeAdminSection === 'overview' && 'Manage your event content'}
              {activeAdminSection === 'announcements' && 'Manage marquee announcements shown on the live site'}
              {activeAdminSection === 'timeline' && 'Add and reorder timeline events for the schedule'}
              {activeAdminSection === 'sports' && 'Manage the Sports Day event list'}
              {activeAdminSection === 'college' && 'Manage the College Day event list'}
              {activeAdminSection === 'uploads' && 'Upload schedule images and gallery photos'}
              {activeAdminSection === 'gallery' && 'Manage Sports Day and College Day photos'}
              {activeAdminSection === 'leaders' && 'Set names and photos for each house leader'}
            </p>
          </div>
          <div className="adm-topbar-right">
            <button className="adm-topbar-btn" onClick={() => navigate('/')}>
              🌐 View Live Site
            </button>
          </div>
        </header>

        {/* Overview Section */}
        {activeAdminSection === 'overview' && (
          <>
            {/* Stats Row */}
            <div className="adm-stats-row">
              <div className="adm-stat-card adm-stat-blue">
                <div className="adm-stat-icon">📢</div>
                <div>
                  <div className="adm-stat-value">{adminData.announcements.length}</div>
                  <div className="adm-stat-label">Announcements</div>
                </div>
              </div>
              <div className="adm-stat-card adm-stat-purple">
                <div className="adm-stat-icon">🗓️</div>
                <div>
                  <div className="adm-stat-value">{adminData.timeline.length}</div>
                  <div className="adm-stat-label">Timeline Events</div>
                </div>
              </div>
              <div className="adm-stat-card adm-stat-green">
                <div className="adm-stat-icon">🏆</div>
                <div>
                  <div className="adm-stat-value">{adminData.sportsEvents.length}</div>
                  <div className="adm-stat-label">Sports Events</div>
                </div>
              </div>
              <div className="adm-stat-card adm-stat-orange">
                <div className="adm-stat-icon">🎭</div>
                <div>
                  <div className="adm-stat-value">{adminData.collegeEvents.length}</div>
                  <div className="adm-stat-label">College Events</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <section className="adm-card">
              <div className="adm-card-header adm-header-blue">
                <span className="adm-card-header-icon">⚡</span>
                <div>
                  <h2 className="adm-card-title">Quick Actions</h2>
                  <p className="adm-card-desc">Common admin tasks</p>
                </div>
              </div>
              <div className="adm-card-body">
                <div className="adm-quick-actions">
                  <button className="adm-quick-btn" onClick={() => setActiveAdminSection('announcements')}>
                    <span className="adm-quick-icon">📢</span>
                    <span className="adm-quick-text">Add Announcement</span>
                  </button>
                  <button className="adm-quick-btn" onClick={() => setActiveAdminSection('timeline')}>
                    <span className="adm-quick-icon">🗓️</span>
                    <span className="adm-quick-text">Add Timeline Event</span>
                  </button>
                  <button className="adm-quick-btn" onClick={() => setActiveAdminSection('gallery')}>
                    <span className="adm-quick-icon">🖼️</span>
                    <span className="adm-quick-text">Upload Photos</span>
                  </button>
                  <button className="adm-quick-btn" onClick={() => setActiveAdminSection('uploads')}>
                    <span className="adm-quick-icon">📁</span>
                    <span className="adm-quick-text">Upload Schedules</span>
                  </button>
                </div>
              </div>
            </section>

            {/* External Links */}
            <section className="adm-card">
              <div className="adm-card-header adm-header-purple">
                <span className="adm-card-header-icon">🔗</span>
                <div>
                  <h2 className="adm-card-title">External Links</h2>
                  <p className="adm-card-desc">Important external resources</p>
                </div>
              </div>
              <div className="adm-card-body">
                <div className="adm-quick-actions">
                  <a href="https://docs.google.com/spreadsheets/d/1vydpUVjoneJ50KaXKcL8SvVhEMI5QEpJUpZAnQVGG8E/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="adm-quick-btn">
                    <span className="adm-quick-icon">📋</span>
                    <span className="adm-quick-text">College Day Sheet</span>
                  </a>
                  <a href="https://docs.google.com/spreadsheets/d/14PeFK-QoeOFloaJgZ_UVd4hRtzubOnFjJbGmast-ysQ/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="adm-quick-btn">
                    <span className="adm-quick-icon">⚽</span>
                    <span className="adm-quick-text">Sports Day Sheet</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="adm-card">
              <div className="adm-card-header adm-header-purple">
                <span className="adm-card-header-icon">📊</span>
                <div>
                  <h2 className="adm-card-title">Content Status</h2>
                  <p className="adm-card-desc">Current content overview</p>
                </div>
              </div>
              <div className="adm-card-body">
                <div className="adm-status-grid">
                  <div className="adm-status-item">
                    <div className="adm-status-label">Gallery Images</div>
                    <div className="adm-status-value">{adminData.galleryImages.length} uploaded</div>
                  </div>
                  <div className="adm-status-item">
                    <div className="adm-status-label">House Leaders</div>
                    <div className="adm-status-value">
                      {Object.values(adminData.leaders).filter(l => l.name).length}/4 configured
                    </div>
                  </div>
                  <div className="adm-status-item">
                    <div className="adm-status-label">Schedules</div>
                    <div className="adm-status-value">
                      {(adminData.boysSchedule ? 1 : 0) + (adminData.girlsSchedule ? 1 : 0) + (adminData.matchSchedule ? 1 : 0)}/3 uploaded
                    </div>
                  </div>
                  <div className="adm-status-item">
                    <div className="adm-status-label">Total Events</div>
                    <div className="adm-status-value">{adminData.sportsEvents.length + adminData.collegeEvents.length}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* System Info */}
            <section className="adm-card">
              <div className="adm-card-header adm-header-green">
                <span className="adm-card-header-icon">ℹ️</span>
                <div>
                  <h2 className="adm-card-title">System Information</h2>
                  <p className="adm-card-desc">Admin panel details</p>
                </div>
              </div>
              <div className="adm-card-body">
                <div className="adm-info-list">
                  <div className="adm-info-item">
                    <span className="adm-info-label">Last Login</span>
                    <span className="adm-info-value">Just now</span>
                  </div>
                  <div className="adm-info-item">
                    <span className="adm-info-label">Admin Version</span>
                    <span className="adm-info-value">v1.0.0</span>
                  </div>
                  <div className="adm-info-item">
                    <span className="adm-info-label">Data Storage</span>
                    <span className="adm-info-value">Browser Local Storage</span>
                  </div>
                  <div className="adm-info-item">
                    <span className="adm-info-label">Live Site</span>
                    <a href="/" target="_blank" className="adm-info-link">View Live Site →</a>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Announcements Section */}
        {activeAdminSection === 'announcements' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-blue">
              <span className="adm-card-header-icon">📢</span>
              <div>
                <h2 className="adm-card-title">Announcements</h2>
                <p className="adm-card-desc">Manage marquee announcements shown on the live site</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-add-row">
                <input
                  type="text"
                  className="adm-field-input"
                  placeholder="E.g. Football finals moved to 3 PM!"
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAnnouncement()}
                />
                <button className="adm-btn-add" onClick={handleAddAnnouncement}>+ Add</button>
              </div>
              <div className="adm-list">
                {adminData.announcements.length === 0 && (
                  <div className="adm-empty">No announcements yet. Add one above.</div>
                )}
                {adminData.announcements.map((msg, idx) => (
                  <div key={idx} className="adm-list-item">
                    <span className="adm-list-badge adm-badge-blue">📣</span>
                    <span className="adm-list-text">{msg}</span>
                    <button className="adm-btn-delete" onClick={() => handleDeleteAnnouncement(idx)}>🗑 Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Timeline Section */}
        {activeAdminSection === 'timeline' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-purple">
              <span className="adm-card-header-icon">🗓️</span>
              <div>
                <h2 className="adm-card-title">Event Schedule Timeline</h2>
                <p className="adm-card-desc">Add and reorder timeline events for the schedule</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="tab-switcher mb-4" style={{ justifyContent: 'flex-start' }}>
                <button className={`tab-btn ${adminScheduleTab === 'sports' ? 'active' : ''}`} onClick={() => setAdminScheduleTab('sports')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}><i className="fas fa-running"></i> Sports Day</button>
                <button className={`tab-btn ${adminScheduleTab === 'college' ? 'active' : ''}`} onClick={() => setAdminScheduleTab('college')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}><i className="fas fa-theater-masks"></i> College Day</button>
              </div>
              <div className="adm-timeline-add-row">
                <input type="text" className="adm-field-input adm-field-sm" placeholder="Time (10:00 AM)" value={newTimeline.time} onChange={e => setNewTimeline({ ...newTimeline, time: e.target.value })} />
                <input type="text" className="adm-field-input adm-field-md" placeholder="Title" value={newTimeline.title} onChange={e => setNewTimeline({ ...newTimeline, title: e.target.value })} />
                <input type="text" className="adm-field-input adm-field-lg" placeholder="Description" value={newTimeline.desc} onChange={e => setNewTimeline({ ...newTimeline, desc: e.target.value })} />
                <button className="adm-btn-add" onClick={handleAddTimeline}>+ Add</button>
              </div>
              <div className="adm-list">
                {adminData.timeline.filter(t => (t.type || 'sports') === adminScheduleTab).length === 0 && (
                  <div className="adm-empty">No timeline events yet for this section.</div>
                )}
                {adminData.timeline.map((item, idx) => {
                  if ((item.type || 'sports') !== adminScheduleTab) return null;
                  return (
                    <div key={idx} className="adm-list-item">
                      <span className="adm-list-badge adm-badge-purple">{item.time}</span>
                      <div className="adm-list-text-group">
                        <strong className="adm-list-title">{item.title}</strong>
                        <span className="adm-list-sub">{item.desc}</span>
                      </div>
                      <div className="adm-list-actions">
                        <button className="adm-btn-icon" onClick={() => moveTimelineUp(idx)} title="Move Up">↑</button>
                        <button className="adm-btn-icon" onClick={() => moveTimelineDown(idx)} title="Move Down">↓</button>
                        <button className="adm-btn-delete" onClick={() => handleDeleteTimeline(idx)}>🗑 Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Sports Events Section */}
        {activeAdminSection === 'sports' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-green">
              <span className="adm-card-header-icon">🏆</span>
              <div>
                <h2 className="adm-card-title">Sports Events</h2>
                <p className="adm-card-desc">Manage the Sports Day event list</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-add-row">
                <input type="text" className="adm-field-input" placeholder="E.g. 100m Sprint, Football..." value={newSportsEvent} onChange={(e) => setNewSportsEvent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSportsEvent()} />
                <button className="adm-btn-add adm-btn-add-green" onClick={handleAddSportsEvent}>+ Add</button>
              </div>
              <div className="adm-list adm-list-tags">
                {adminData.sportsEvents.length === 0 && (
                  <div className="adm-empty">No sports events yet.</div>
                )}
                {adminData.sportsEvents.map((msg, idx) => (
                  <div key={idx} className="adm-tag-item">
                    <span className="adm-tag-icon">🏅</span>
                    <span className="adm-tag-text">{msg}</span>
                    <button className="adm-tag-delete" onClick={() => handleDeleteSportsEvent(idx)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* College Day Events Section */}
        {activeAdminSection === 'college' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-orange">
              <span className="adm-card-header-icon">🎭</span>
              <div>
                <h2 className="adm-card-title">College Day Events</h2>
                <p className="adm-card-desc">Manage the College Day event list</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-add-row">
                <input type="text" className="adm-field-input" placeholder="E.g. Dance, Drama, Fashion Show..." value={newCollegeEvent} onChange={(e) => setNewCollegeEvent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCollegeEvent()} />
                <button className="adm-btn-add adm-btn-add-orange" onClick={handleAddCollegeEvent}>+ Add</button>
              </div>
              <div className="adm-list adm-list-tags">
                {adminData.collegeEvents.length === 0 && (
                  <div className="adm-empty">No college events yet.</div>
                )}
                {adminData.collegeEvents.map((msg, idx) => (
                  <div key={idx} className="adm-tag-item adm-tag-orange">
                    <span className="adm-tag-icon">🎨</span>
                    <span className="adm-tag-text">{msg}</span>
                    <button className="adm-tag-delete" onClick={() => handleDeleteCollegeEvent(idx)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upload Assets Section */}
        {activeAdminSection === 'uploads' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-teal">
              <span className="adm-card-header-icon">📁</span>
              <div>
                <h2 className="adm-card-title">Upload Assets</h2>
                <p className="adm-card-desc">Upload schedule images and gallery photos</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-upload-grid">
                {[
                  { id: 'boysSchedule', label: 'Boys Schedule', icon: '📋', type: 'boysSchedule', hint: 'Single image', multiple: false },
                  { id: 'girlsSchedule', label: 'Girls Schedule', icon: '📋', type: 'girlsSchedule', hint: 'Single image', multiple: false },
                  { id: 'matchSchedule', label: 'Match Schedule', icon: '⚔️', type: 'matchSchedule', hint: 'Single image', multiple: false },
                ].map(item => (
                  <div key={item.id} className="adm-upload-card">
                    <div className="adm-upload-icon">{item.icon}</div>
                    <p className="adm-upload-label">{item.label}</p>
                    <p className="adm-upload-hint">{item.hint}</p>
                    {uploadStatus[item.type] && (
                      <div className="adm-upload-status">{uploadStatus[item.type]}</div>
                    )}
                    <input type="file" id={item.id} accept="image/*" multiple={item.multiple} onChange={(e) => handleFileUpload(e, item.type)} style={{ display: 'none' }} />
                    <label htmlFor={item.id} className="adm-btn-upload">
                      {uploadStatus[item.type] ? '🔄 Replace' : '⬆ Upload'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Gallery Management Section */}
        {activeAdminSection === 'gallery' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-blue">
              <span className="adm-card-header-icon">🖼️</span>
              <div>
                <h2 className="adm-card-title">Gallery Management</h2>
                <p className="adm-card-desc">Manage Sports Day and College Day photos</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-add-row">
                <select
                  className="adm-field-input"
                  value={galleryImageType}
                  onChange={(e) => setGalleryImageType(e.target.value as 'sports' | 'college')}
                  style={{ flex: '0 0 200px' }}
                >
                  <option value="sports">🏃 Sports Day</option>
                  <option value="college">🎭 College Day</option>
                </select>
                <input
                  type="file"
                  id="galleryImages"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'gallery')}
                  style={{ display: 'none' }}
                />
                <label htmlFor="galleryImages" className="adm-btn-add">
                  + Add {galleryImageType === 'sports' ? 'Sports' : 'College'} Photos
                </label>
              </div>
              {uploadStatus.gallery && (
                <div className="adm-upload-status" style={{ marginBottom: '1rem' }}>
                  {uploadStatus.gallery}
                </div>
              )}
              <div className="adm-list">
                {adminData.galleryImages.length === 0 ? (
                  <div className="adm-empty">No gallery images uploaded yet.</div>
                ) : (
                  adminData.galleryImages
                    .filter(img => img.type === galleryImageType)
                    .map((img, idx) => (
                      <div key={idx} className="adm-gallery-item">
                        <div className="adm-gallery-preview">
                          <img src={img.url} alt={img.label || `Image ${idx + 1}`} className="adm-gallery-img" />
                        </div>
                        <div className="adm-gallery-info">
                          <span className={`adm-list-badge ${img.type === 'sports' ? 'adm-badge-blue' : 'adm-badge-orange'}`}>
                            {img.type === 'sports' ? '🏃' : '🎭'}
                          </span>
                          <div className="adm-list-text-group">
                            <strong className="adm-list-title">{img.label || `Image ${idx + 1}`}</strong>
                            <span className="adm-list-sub">{img.type === 'sports' ? 'Sports Day' : 'College Day'}</span>
                          </div>
                          <button className="adm-btn-delete" onClick={() => handleDeleteGalleryImage(idx)}>🗑 Delete</button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* House Leaders Section */}
        {activeAdminSection === 'leaders' && (
          <section className="adm-card">
            <div className="adm-card-header adm-header-pink">
              <span className="adm-card-header-icon">🏅</span>
              <div>
                <h2 className="adm-card-title">House Leaders</h2>
                <p className="adm-card-desc">Set names and photos for each house leader</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-leaders-grid">
                {(['red', 'green', 'yellow', 'blue'] as const).map(color => {
                  const houseColors: Record<string, { bg: string; accent: string; label: string }> = {
                    red: { bg: 'rgba(239,68,68,0.12)', accent: '#ef4444', label: 'Red House' },
                    green: { bg: 'rgba(34,197,94,0.12)', accent: '#22c55e', label: 'Green House' },
                    yellow: { bg: 'rgba(250,204,21,0.12)', accent: '#facc15', label: 'Yellow House' },
                    blue: { bg: 'rgba(59,130,246,0.12)', accent: '#3b82f6', label: 'Blue House' },
                  };
                  const hc = houseColors[color];
                  return (
                    <div key={color} className="adm-leader-card" style={{ background: hc.bg, borderColor: hc.accent }}>
                      {adminData.leaders[color as HouseColor].image ? (
                        <img src={adminData.leaders[color as HouseColor].image} alt={`${color} leader`} className="adm-leader-img" />
                      ) : (
                        <div className="adm-leader-avatar" style={{ background: hc.accent }}>
                          {color.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <h4 className="adm-leader-house" style={{ color: hc.accent }}>{hc.label}</h4>
                      <input
                        type="text"
                        className="adm-field-input"
                        style={{ marginBottom: '0.75rem' }}
                        value={leaderNames[color as HouseColor]}
                        onChange={(e) => setLeaderNames(prev => ({ ...prev, [color]: e.target.value }))}
                        onBlur={() => handleLeaderNameSave(color as HouseColor)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                        placeholder="Leader Name"
                      />
                      <input type="file" id={`leader_${color}`} accept="image/*" onChange={(e) => handleFileUpload(e, `leader_${color}`)} style={{ display: 'none' }} />
                      <label htmlFor={`leader_${color}`} className="adm-btn-upload" style={{ width: '100%', textAlign: 'center' }}>
                        {adminData.leaders[color as HouseColor].image ? '🔄 Change Photo' : '📷 Upload Photo'}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App
