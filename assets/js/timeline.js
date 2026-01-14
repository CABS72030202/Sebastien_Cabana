/**
 * Git-style Timeline Generator
 * Automatically calculates branch structure based on date overlaps
 */

class TimelineGenerator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cards = [];
        this.junctions = [];
        this.branches = [];
        this.TRUNK_X = 20; // Position X du tronc principal
        this.BRANCH_SPACING = 35; // Espacement entre les branches
    }

    /**
     * Ajoute une carte à la timeline
     * @param {Object} card - Informations de la carte
     */
    addCard(card) {
        this.cards.push({
            id: card.id,
            title: card.title,
            subtitle: card.subtitle,
            location: card.location,
            description: card.description || [],
            tags: card.tags || [],
            startDate: new Date(card.startDate),
            endDate: card.endDate ? new Date(card.endDate) : new Date(), // "Présent" = maintenant
            type: card.type || 'subtle', // 'primary', 'subtle', 'marker'
            icon: card.icon,
            branch: 0, // Sera calculé
            branchLevel: 0, // Position sur l'axe horizontal
            dotX: this.TRUNK_X, // Position X du point
            junctionStart: null, // Point de jonction au début
            junctionEnd: null // Point de jonction à la fin
        });
    }

    /**
     * Calcule la structure de branches basée sur les superpositions temporelles
     */
    calculateBranches() {
        // Trier par date de début (du plus ancien au plus récent)
        this.cards.sort((a, b) => a.startDate - b.startDate);

        // Étape 1: Créer les points de jonction pour chaque carte A/B
        const junctionPoints = []; // {date, cardIds: [], combinedId}
        
        for (const card of this.cards) {
            if (card.type === 'marker') {
                card.branchLevel = 0;
                card.dotX = this.TRUNK_X;
                continue;
            }
            
            // Ajouter point de début
            const startTime = card.startDate.getTime();
            let startPoint = junctionPoints.find(jp => jp.date.getTime() === startTime);
            if (!startPoint) {
                startPoint = {
                    date: card.startDate,
                    cardIds: [],
                    combinedId: `junction-${startTime}`,
                    type: 'combined'
                };
                junctionPoints.push(startPoint);
            }
            startPoint.cardIds.push({cardId: card.id, isStart: true});
            
            // Ajouter point de fin
            const endTime = card.endDate.getTime();
            let endPoint = junctionPoints.find(jp => jp.date.getTime() === endTime);
            if (!endPoint) {
                endPoint = {
                    date: card.endDate,
                    cardIds: [],
                    combinedId: `junction-${endTime}`,
                    type: 'combined'
                };
                junctionPoints.push(endPoint);
            }
            endPoint.cardIds.push({cardId: card.id, isStart: false});
        }
        
        // Trier les points de jonction par date
        junctionPoints.sort((a, b) => a.date - b.date);
        
        // Étape 2: Calculer les niveaux de branche basés sur l'imbrication
        const workCards = this.cards.filter(c => c.type !== 'marker');
        
        for (const card of workCards) {
            // Trouver si cette carte est imbriquée dans une autre
            const containerCards = workCards.filter(other => 
                other.id !== card.id &&
                other.startDate <= card.startDate &&
                other.endDate >= card.endDate
            );
            
            if (containerCards.length === 0) {
                // Pas de conteneur - niveau 1
                card.branchLevel = 1;
            } else {
                // Imbriquée - prendre le niveau du conteneur le plus profond + 1
                const maxContainerLevel = Math.max(...containerCards.map(c => c.branchLevel || 1));
                card.branchLevel = maxContainerLevel + 1;
            }
            
            card.dotX = this.TRUNK_X + (card.branchLevel * this.BRANCH_SPACING);
        }
        
        // Étape 3: Créer les jonctions sur la branche mère appropriée
        for (const jp of junctionPoints) {
            // Pour chaque jonction, déterminer le niveau basé sur les cartes associées
            const associatedCards = jp.cardIds.map(item => 
                this.cards.find(c => c.id === item.cardId)
            ).filter(c => c); // Filtrer les undefined
            
            if (associatedCards.length > 0) {
                // Trouver le niveau le plus bas (le plus proche du trunk) parmi les cartes associées
                const minBranchLevel = Math.min(...associatedCards.map(c => c.branchLevel));
                // La jonction est sur la branche parente (niveau - 1)
                const junctionLevel = Math.max(0, minBranchLevel - 1);
                
                this.junctions.push({
                    id: jp.combinedId,
                    cardIds: jp.cardIds,
                    type: 'junction',
                    dotX: this.TRUNK_X + (junctionLevel * this.BRANCH_SPACING),
                    date: jp.date
                });
            }
        }

        // Inverser l'ordre pour affichage du plus récent au plus ancien
        this.cards.reverse();
        console.log('Branches calculées:', this.cards);
        console.log('Jonctions:', this.junctions);
    }

    /**
     * Génère le HTML de la timeline
     */
    render() {
        if (!this.container) {
            console.error('Container not found');
            return;
        }

        // Calculer les branches avant de rendre
        this.calculateBranches();

        let html = '<div class="git-trunk"></div>';

        // Créer un tableau combiné de cartes et jonctions, trié par date (plus récent en premier)
        const allItems = [];
        
        // Ajouter les cartes
        this.cards.forEach(card => {
            allItems.push({
                type: 'card',
                date: card.startDate,
                item: card
            });
        });
        
        // Ajouter les jonctions
        this.junctions.forEach(junction => {
            allItems.push({
                type: 'junction',
                date: junction.date,
                item: junction
            });
        });
        
        // Trier par date (plus récent en premier, puisque cards est déjà inversé)
        allItems.sort((a, b) => b.date - a.date);
        
        // Filtrer les jonctions successives
        const finalItems = [];
        for (let i = 0; i < allItems.length; i++) {
            const current = allItems[i];
            const next = allItems[i + 1];

            if (current.type === 'junction' && next && next.type === 'junction' && current.item.dotX === next.item.dotX) {
                // Deux jonctions successives sur la même branche, on ignore la plus récente (current)
                continue;
            }
            finalItems.push(current);
        }
        
        // Générer le HTML
        finalItems.forEach(element => {
            if (element.type === 'card') {
                html += this.renderCard(element.item);
            } else {
                html += this.renderJunction(element.item);
            }
        });

        this.container.innerHTML = html;
    }

    /**
     * Génère le HTML pour une carte
     */
    renderCard(card) {
        const cardClass = `git-card-${card.type}`;
        const dotClass = card.type === 'marker' ? 'git-dot-marker' : 
                        card.type === 'primary' ? '' : 'git-dot-subtle';
        
        // Toutes les cartes sont alignées à gauche
        const marginLeft = 10;

        let cardContent = '';
        if (card.type === 'marker') {
            cardContent = `
                <div class="git-card ${cardClass}" style="margin-left: ${marginLeft}px;">
                    <span class="git-marker-icon"><i class="${card.icon}"></i></span>
                    <span>${card.title}</span>
                    <span class="git-date">${this.formatDate(card.startDate)}</span>
                </div>
            `;
        } else {
            const endDateStr = card.endDate > new Date(2025, 11, 1) ? 'Présent' : this.formatDate(card.endDate);
            cardContent = `
                <div class="git-card ${cardClass}" style="margin-left: ${marginLeft}px;">
                    <div class="git-card-top">
                        <div class="git-card-date">
                            <i class="far fa-calendar"></i>
                            <span>${this.formatDate(card.startDate)} – ${endDateStr}</span>
                        </div>
                        <div class="git-card-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${card.location || ''}</span>
                        </div>
                    </div>
                    <div class="git-card-divider"></div>
                    <div class="git-card-content">
                        <h3 class="git-card-title">${card.title}</h3>
                        ${card.subtitle ? `<h4 class="git-card-subtitle">${card.subtitle}</h4>` : ''}
                        ${card.description && card.description.length > 0 ? `
                        <ul class="git-card-description">
                            ${card.description.map(item => `<li>${item}</li>`).join('')}
                        </ul>` : ''}
                        ${card.tags && card.tags.length > 0 ? `
                        <div class="git-card-tags">
                            ${card.tags.map(tag => `<span class="git-tag"><i class="${tag.icon}"></i> ${tag.name}</span>`).join('')}
                        </div>` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="git-entry" data-card-id="${card.id}" data-branch="${card.branchLevel}">
                <div class="git-node" style="left: -80px;">
                    <div class="git-dot ${dotClass}" style="left: ${card.dotX - 20}px; transform: translate(-50%, -50%);"></div>
                </div>
                ${cardContent}
            </div>
        `;
    }

    /**
     * Génère le HTML pour un point de jonction
     */
    renderJunction(junction) {
        return `
            <div class="git-entry git-junction" data-junction-id="${junction.id}" data-type="${junction.type}">
                <div class="git-node" style="left: -80px;">
                    <div class="git-junction-dot" style="left: ${junction.dotX - 20}px; transform: translateX(-50%);"></div>
                </div>
            </div>
        `;
    }

    /**
     * Formate une date pour l'affichage
     */
    formatDate(date) {
        const months = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 
                       'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}

// Initialiser la timeline au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    const timeline = new TimelineGenerator('git-timeline-container');
    
    // 2019 - Début Cégep
    timeline.addCard({
        id: 'cegep-start',
        title: 'Début études collégiales',
        startDate: '2019-09-01',
        type: 'marker',
        icon: 'fas fa-laptop-code'
    });

    // 2019 - Tim Hortons
    timeline.addCard({
        id: 'tim-hortons',
        title: 'Assistant-gérant',
        subtitle: 'Tim Hortons',
        location: 'Saint-Jérôme, QC',
        description: [
            'Gestion d\'équipe et supervision des opérations quotidiennes',
            'Formation et développement du personnel',
            'Service à la clientèle de haute qualité'
        ],
        tags: [
            { icon: 'fas fa-users', name: 'Gestion d\'équipe' },
            { icon: 'fas fa-cogs', name: 'Opérations' },
            { icon: 'fas fa-handshake', name: 'Service client' }
        ],
        startDate: '2019-07-01',
        endDate: '2023-06-01',
        type: 'subtle'
    });

    // 2020 - Manoeuvre
    timeline.addCard({
        id: 'manoeuvre',
        title: 'Manœuvre',
        subtitle: 'Cégep de Saint-Jérôme',
        location: 'Saint-Jérôme, QC',
        description: [
            'Travaux d\'entretien et de maintenance',
            'Support aux opérations du campus'
        ],
        tags: [
            { icon: 'fas fa-tools', name: 'Fiabilité' },
            { icon: 'fas fa-users', name: 'Travail d\'équipe' },
            { icon: 'fas fa-sync-alt', name: 'Adaptabilité' }
        ],
        startDate: '2020-03-01',
        endDate: '2023-05-01',
        type: 'subtle'
    });

    // 2023 - Fin Cégep
    timeline.addCard({
        id: 'cegep-end',
        title: 'Fin études collégiales',
        startDate: '2023-05-01',
        type: 'marker',
        icon: 'fas fa-graduation-cap'
    });

    // 2023 - CIUSSS
    timeline.addCard({
        id: 'ciusss',
        title: 'Agent administratif',
        subtitle: 'CIUSSS MCQ – Département de radio-oncologie',
        location: 'Trois-Rivières, QC',
        description: [
            'Automatisation de processus administratifs avec VBA et Excel',
            'Gestion de documents et support aux opérations',
            'Administration dans le secteur de la santé'
        ],
        tags: [
            { icon: 'fas fa-file-excel', name: 'VBA & Excel' },
            { icon: 'fas fa-robot', name: 'Automatisation' },
            { icon: 'fas fa-hospital', name: 'Santé' }
        ],
        startDate: '2023-08-01',
        endDate: '2026-12-31', // Présent
        type: 'subtle'
    });

    // 2023 - Début Université
    timeline.addCard({
        id: 'uqtr-start',
        title: 'Début études universitaires',
        startDate: '2023-09-01',
        type: 'marker',
        icon: 'fas fa-university'
    });

    // 2023 - Volleyball
    timeline.addCard({
        id: 'volleyball',
        title: 'Entraîneur de volleyball',
        subtitle: 'Académie Les Estacades',
        location: 'Trois-Rivières, QC',
        description: [
            'Encadrement et développement d\'athlètes',
            'Planification d\'entraînements et stratégies de jeu',
            'Leadership et mentorat'
        ],
        tags: [
            { icon: 'fas fa-volleyball-ball', name: 'Volleyball' },
            { icon: 'fas fa-user-tie', name: 'Leadership' },
            { icon: 'fas fa-chalkboard-teacher', name: 'Mentorat' }
        ],
        startDate: '2023-09-01',
        endDate: '2024-05-01',
        type: 'subtle'
    });

    // 2025 - UQTR Research
    timeline.addCard({
        id: 'uqtr-research',
        title: 'Assistant de recherche',
        subtitle: 'Université du Québec à Trois-Rivières',
        location: 'Trois-Rivières, QC',
        description: [
            'Rédaction de guides techniques et production de capsules vidéo pédagogiques',
            'Conception de démonstrateurs matériels (amplificateur audio 3 bandes)',
            'Contribution à la structuration de cours par projet',
            'Gestion autonome des priorités et documentation technique',
            'Utilisation de Git et Microsoft 365 pour la collaboration'
        ],
        tags: [
            { icon: 'fas fa-microchip', name: 'PCB Design' },
            { icon: 'fas fa-drafting-compass', name: 'Altium Designer' },
            { icon: 'fas fa-cube', name: 'SolidWorks' },
            { icon: 'fas fa-ruler-combined', name: 'Mesure' },
            { icon: 'fas fa-video', name: 'Contenu multimédia' },
            { icon: 'fab fa-git-alt', name: 'Git' }
        ],
        startDate: '2025-05-01',
        endDate: '2026-12-31', // Présent
        type: 'primary'
    });

    // Générer la timeline
    timeline.render();
});
