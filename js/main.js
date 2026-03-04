/**
 * KONCEPT - Main JavaScript
 * Clean, performance-focused interactions
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const CONFIG = {
        animationThreshold: 0.1,
        animationRootMargin: '0px 0px -50px 0px',
        headerScrollThreshold: 50
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    /**
     * Throttle function execution
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Check if user prefers reduced motion
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ========================================
    // HEADER SCROLL BEHAVIOR
    // ========================================
    
    function initHeader() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = 0;
        let ticking = false;

        function updateHeader() {
            const scrollY = window.scrollY;
            
            // Add/remove scrolled class
            if (scrollY > CONFIG.headerScrollThreshold) {
                header.classList.add('header--scrolled');
            } else {
                header.classList.remove('header--scrolled');
            }
            
            lastScrollY = scrollY;
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick, { passive: true });
        
        // Initial check
        updateHeader();
    }

    // ========================================
    // MOBILE NAVIGATION
    // ========================================
    
    function initMobileNav() {
        const toggle = document.querySelector('.nav__toggle');
        const menu = document.querySelector('.nav__menu');
        
        if (!toggle || !menu) return;

        function toggleMenu() {
            const isOpen = menu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', isOpen);
            toggle.setAttribute('aria-label', isOpen ? 'Zamknij menu' : 'Otwórz menu');
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }

        function closeMenu() {
            menu.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Otwórz menu');
            document.body.style.overflow = '';
        }

        toggle.addEventListener('click', toggleMenu);

        // Close menu when clicking on links
        menu.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) {
                closeMenu();
            }
        });

        // Close menu on resize (if going to desktop)
        window.addEventListener('resize', throttle(() => {
            if (window.innerWidth > 768 && menu.classList.contains('is-open')) {
                closeMenu();
            }
        }, 100));
    }

    // ========================================
    // SCROLL ANIMATIONS (Intersection Observer)
    // ========================================
    
    function initScrollAnimations() {
        if (prefersReducedMotion()) return;

        const animatedElements = document.querySelectorAll('[data-animate]');
        if (!animatedElements.length) return;

        const observerOptions = {
            root: null,
            rootMargin: CONFIG.animationRootMargin,
            threshold: CONFIG.animationThreshold
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Unobserve after animation
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => observer.observe(el));
    }

    // ========================================
    // PROCESS STEPPER ANIMATION
    // ========================================
    
    function initProcessStepper() {
        const progressBar = document.getElementById('processProgress');
        const steps = document.querySelectorAll('.process-stepper__step');
        
        if (!progressBar || !steps.length) return;
        
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.3
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate progress bar
                    setTimeout(() => {
                        progressBar.classList.add('is-animated');
                    }, 300);
                    
                    // Animate steps with stagger
                    steps.forEach((step, index) => {
                        setTimeout(() => {
                            step.classList.add('is-visible');
                        }, 500 + (index * 200));
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        observer.observe(progressBar.parentElement);
    }

    // ========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================
    
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (!targetElement) return;

                e.preventDefault();
                
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
                });

                // Set focus for accessibility
                targetElement.setAttribute('tabindex', '-1');
                targetElement.focus({ preventScroll: true });
            });
        });
    }

    // ========================================
    // CURRENT YEAR IN FOOTER
    // ========================================
    
    function initCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // ========================================
    // ANIMATED COUNTERS
    // ========================================
    
    function initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        // Easing function for smooth animation
        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-count'));
                    const duration = 2000; // 2 seconds for smoother animation
                    let startTime = null;

                    const updateCounter = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Apply easing
                        const easedProgress = easeOutExpo(progress);
                        const current = Math.floor(easedProgress * target);
                        
                        counter.textContent = current;

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                        }
                    };

                    requestAnimationFrame(updateCounter);
                    observer.unobserve(counter);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    // ========================================
    // MOBILE STICKY CTA
    // ========================================
    
    function initMobileStickyCta() {
        const stickyCta = document.getElementById('mobileStickyCta');
        if (!stickyCta) return;

        // Show after scrolling past hero
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    stickyCta.classList.remove('is-visible');
                } else {
                    stickyCta.classList.add('is-visible');
                }
            });
        }, { threshold: 0 });

        observer.observe(hero);
    }

    // ========================================
    // FORM VALIDATION (if forms exist)
    // ========================================
    
    function initFormValidation() {
        const forms = document.querySelectorAll('form[data-validate]');
        if (!forms.length) return;

        function clearFieldError(field) {
            field.classList.remove('is-invalid');
            const container = field.closest('.form-group') || field.parentNode;
            if (!container) return;
            const errorMsg = container.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        }

        function setFieldError(field, message) {
            const container = field.closest('.form-group') || field.parentNode;
            if (!container) return;

            field.classList.add('is-invalid');

            const error = document.createElement('span');
            error.className = 'error-message';
            error.textContent = message;
            error.setAttribute('role', 'alert');
            container.appendChild(error);
        }

        function showFormStatus(form, message, type) {
            const statusElement = form.querySelector('[data-form-status]');
            if (!statusElement) return;

            statusElement.textContent = message;
            statusElement.classList.remove('is-success', 'is-error');

            if (type === 'success') statusElement.classList.add('is-success');
            if (type === 'error') statusElement.classList.add('is-error');
        }
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                let isValid = true;
                let firstInvalidField = null;
                const requiredFields = form.querySelectorAll('[required]');
                const action = (form.getAttribute('action') || '').trim();
                const isPlaceholderAction = !action || action === '#' || action === '/send';

                showFormStatus(form, '');

                requiredFields.forEach(field => {
                    clearFieldError(field);

                    const isCheckbox = field.type === 'checkbox' || field.type === 'radio';
                    const fieldValue = typeof field.value === 'string' ? field.value.trim() : '';
                    const isEmpty = isCheckbox ? !field.checked : !fieldValue;

                    if (isEmpty) {
                        isValid = false;
                        if (!firstInvalidField) firstInvalidField = field;
                        setFieldError(field, 'To pole jest wymagane');
                        return;
                    }
                    
                    // Email validation
                    if (field.type === 'email' && fieldValue) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(fieldValue)) {
                            isValid = false;
                            if (!firstInvalidField) firstInvalidField = field;
                            setFieldError(field, 'Wpisz poprawny adres e-mail');
                        }
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    showFormStatus(form, 'Popraw formularz i spróbuj ponownie.', 'error');
                    if (firstInvalidField) firstInvalidField.focus();
                    return;
                }

                if (isPlaceholderAction) {
                    e.preventDefault();

                    const recipient = form.dataset.recipient || 'kontakt@koncept.pl';
                    const formData = new FormData(form);

                    const name = (formData.get('name') || '').toString().trim();
                    const phone = (formData.get('phone') || '').toString().trim();
                    const email = (formData.get('email') || '').toString().trim();
                    const service = (formData.get('service') || '').toString().trim();
                    const budget = (formData.get('budget') || '').toString().trim();
                    const message = (formData.get('message') || '').toString().trim();

                    const subject = name ? `Zapytanie ze strony - ${name}` : 'Zapytanie ze strony';
                    const body = [
                        'Nowe zapytanie ze strony koncept.pl',
                        '',
                        `Imie i nazwisko: ${name || '-'}`,
                        `Telefon: ${phone || '-'}`,
                        `Email: ${email || '-'}`,
                        `Rodzaj uslugi: ${service || '-'}`,
                        `Budzet: ${budget || '-'}`,
                        '',
                        'Opis projektu:',
                        message || '-'
                    ].join('\n');

                    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    showFormStatus(form, 'Otworzylismy Twoj program pocztowy.', 'success');
                }
            });
        });
    }

    // ========================================
    // ACTIVE NAV LINK BASED ON SCROLL
    // ========================================
    
    function initActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav__link');
        
        if (!sections.length || !navLinks.length) return;
        
        // Only run scroll-based active state if there are anchor links to sections.
        const sectionLinks = Array.from(navLinks).filter(link => {
            const href = link.getAttribute('href');
            return typeof href === 'string' && href.includes('#');
        });

        if (!sectionLinks.length) return;

        function isLinkForSection(link, sectionId) {
            const href = link.getAttribute('href');
            if (!href || href === '#') return false;
            if (href === `#${sectionId}`) return true;

            try {
                const linkUrl = new URL(href, window.location.href);
                return linkUrl.pathname === window.location.pathname && linkUrl.hash === `#${sectionId}`;
            } catch (error) {
                return false;
            }
        }

        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');

                    const activeLink = sectionLinks.find(link => isLinkForSection(link, id));
                    if (!activeLink) return;

                    sectionLinks.forEach(link => {
                        link.classList.remove('nav__link--active');
                        link.removeAttribute('aria-current');
                    });

                    activeLink.classList.add('nav__link--active');
                    activeLink.setAttribute('aria-current', 'page');
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    // ========================================
    // HERO BACKGROUND DOTS ANIMATION
    // ========================================
    
    function initHeroDots() {
        // Only skip if user prefers reduced motion
        if (prefersReducedMotion()) return;
        
        const container = document.getElementById('heroDots');
        if (!container) return;

        const config = {
            maxDots: 30,          // Max visible dots at once
            spawnInterval: 180,   // New dot every ~0.18 seconds
            dotLifetime: 4500,    // Dot lives for ~4.5 seconds
            mouseRadius: 120,     // Mouse interaction radius
            mouseForce: 15,       // How much dots move from mouse
            minDotDistance: 60,   // Minimum distance between dots
            edgeMargin: 60,       // Margin from screen edges
            navMargin: 100        // Extra margin from nav/menu
        };

        const dots = [];
        let mouseX = -1000;
        let mouseY = -1000;
        let lastSpawn = 0;
        let animationId = null;
        let isVisible = true;

        // Track mouse position
        document.addEventListener('mousemove', throttle((e) => {
            const rect = container.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        }, 16), { passive: true });

        // Pause when tab hidden
        document.addEventListener('visibilitychange', () => {
            isVisible = !document.hidden;
        });

        // Check if position overlaps with nav/header
        function isOverNav(x, y) {
            const nav = document.querySelector('.nav');
            if (!nav) return false;
            
            const rect = nav.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const navLeft = rect.left - containerRect.left;
            const navTop = rect.top - containerRect.top;
            const navRight = navLeft + rect.width;
            const navBottom = navTop + rect.height;
            
            return x >= navLeft && x <= navRight && y >= navTop - 20 && y <= navBottom + config.navMargin;
        }

        // Check if position overlaps with specific text elements (with tiny padding)
        function isOverTextElements(x, y) {
            const elements = document.querySelectorAll('.hero__title-line, .hero__subtitle, .hero__cta, .hero__stats');
            const containerRect = container.getBoundingClientRect();
            
            for (const el of elements) {
                const rect = el.getBoundingClientRect();
                const elLeft = rect.left - containerRect.left;
                const elTop = rect.top - containerRect.top;
                const elRight = elLeft + rect.width;
                const elBottom = elTop + rect.height;
                
                // Tiny 2px padding to not cover text directly
                if (x >= elLeft - 2 && x <= elRight + 2 && y >= elTop - 2 && y <= elBottom + 2) {
                    return true;
                }
            }
            return false;
        }

        function getDistance(x1, y1, x2, y2) {
            return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        }

        function isTooCloseToOtherDots(x, y) {
            return dots.some(dot => getDistance(x, y, dot.baseX, dot.baseY) < config.minDotDistance);
        }

        function isTooCloseToEdges(x, y) {
            const rect = container.getBoundingClientRect();
            return x < config.edgeMargin || 
                   x > rect.width - config.edgeMargin ||
                   y < config.edgeMargin || 
                   y > rect.height - config.edgeMargin;
        }

        function createDot() {
            if (dots.length >= config.maxDots) return;

            const rect = container.getBoundingClientRect();
            let x, y;
            let attempts = 0;
            
            // Find position not over nav/text, not too close to edges, and not too close to other dots
            do {
                x = Math.random() * rect.width;
                y = Math.random() * rect.height;
                attempts++;
            } while ((isOverNav(x, y) || isOverTextElements(x, y) || isTooCloseToEdges(x, y) || isTooCloseToOtherDots(x, y)) && attempts < 50);
            
            if (attempts >= 50) return; // Skip if can't find valid position

            const dot = document.createElement('div');
            dot.className = 'hero__dot';
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            
            // Random slight variation in size (slightly larger)
            const size = 4 + Math.random() * 3;
            dot.style.width = size + 'px';
            dot.style.height = size + 'px';
            
            container.appendChild(dot);

            const dotData = {
                element: dot,
                baseX: x,
                baseY: y,
                created: Date.now(),
                phase: Math.random() * Math.PI * 2
            };

            dots.push(dotData);

            // Trigger fade in
            requestAnimationFrame(() => {
                dot.classList.add('hero__dot--visible');
            });
        }

        function removeDot(dotData) {
            dotData.element.classList.add('hero__dot--fading');
            dotData.element.classList.remove('hero__dot--visible');
            
            setTimeout(() => {
                if (dotData.element.parentNode) {
                    dotData.element.parentNode.removeChild(dotData.element);
                }
            }, 250);

            const index = dots.indexOf(dotData);
            if (index > -1) dots.splice(index, 1);
        }

        function updateDots() {
            if (!isVisible) {
                animationId = requestAnimationFrame(updateDots);
                return;
            }

            const now = Date.now();

            // Spawn new dots
            if (now - lastSpawn > config.spawnInterval + Math.random() * 1000) {
                createDot();
                lastSpawn = now;
            }

            // Update existing dots
            dots.forEach(dotData => {
                const age = now - dotData.created;

                // Remove old dots
                if (age > config.dotLifetime) {
                    removeDot(dotData);
                    return;
                }

                // Calculate mouse interaction
                const dx = mouseX - dotData.baseX;
                const dy = mouseY - dotData.baseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let offsetX = 0;
                let offsetY = 0;

                if (distance < config.mouseRadius && distance > 0) {
                    const force = (1 - distance / config.mouseRadius) * config.mouseForce;
                    offsetX = -(dx / distance) * force;
                    offsetY = -(dy / distance) * force;
                }

                // Subtle floating motion (slightly more dynamic)
                const floatX = Math.sin(now * 0.0012 + dotData.phase) * 3;
                const floatY = Math.cos(now * 0.0018 + dotData.phase) * 3;

                // Apply transform
                const x = offsetX + floatX;
                const y = offsetY + floatY;
                dotData.element.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

                // Fade out - peak at 55% opacity, then fade away in last 800ms
                if (age > config.dotLifetime - 800) {
                    const fadeProgress = (age - (config.dotLifetime - 800)) / 800;
                    dotData.element.style.opacity = 0.55 * (1 - fadeProgress * fadeProgress);
                } else {
                    dotData.element.style.opacity = 0.55;
                }
            });

            animationId = requestAnimationFrame(updateDots);
        }

        // Start with more dots for immediate effect
        for (let i = 0; i < 15; i++) {
            setTimeout(createDot, i * 60);
        }

        updateDots();

        // Cleanup on page hide
        window.addEventListener('pagehide', () => {
            if (animationId) cancelAnimationFrame(animationId);
        });
    }

    // ========================================
    // PERFORMANCE: LAZY LOAD IMAGES
    // ========================================
    
    function initLazyLoad() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('is-loaded');
                        imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '50px' });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    // ========================================
    // INITIALIZE ALL MODULES
    // ========================================
    
    function init() {
        // Core functionality
        initHeader();
        initMobileNav();
        initScrollAnimations();
        initSmoothScroll();
        initCurrentYear();
        initFormValidation();
        initActiveNavLink();
        initLazyLoad();
        initCounters();
        initMobileStickyCta();
        initHeroDots();
        initProcessStepper();

        // Add loaded class to body for CSS transitions
        document.body.classList.add('is-loaded');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global scope for debugging
    window.koncept = {
        CONFIG,
        init,
        prefersReducedMotion
    };

})();
