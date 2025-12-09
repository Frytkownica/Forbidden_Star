document.addEventListener('DOMContentLoaded', function () {
	const expansionTabsContainer = document.getElementById('expansion-tabs');
	const factionTabsContainer = document.getElementById('faction-tabs');
	const cardsContentsContainer = document.getElementById('cards-tabs');
	const cardsContainer = document.getElementById('cards-container');

	// Size of cards - rest is calculated just based on this.
	const maxWidth = 450;
	const maxHeight = 650;

	// Size of boxes for combat cards.
	const textBackgroundSize = 759;
	const textBottomBarHeight = 18;
	const textBottomBarWidth = 454;

	const titleFontSize = maxHeight * 0.05;
	const marginWidth = maxWidth * 0.0578;
	const maxTextWidth = maxWidth - 2 * marginWidth;

	// Icons positioning predefinitions.
	const iconSize = maxWidth * 0.08;
	const iconSpacing = maxWidth * 0.01;
	const iconY = maxHeight * 0.91;
	const startX = maxWidth * 0.05;

	const iconMap = {
		'B': 'pictures/bolter.png',
		'S': 'pictures/shield.png',
		'M': 'pictures/moral.png'
	};

	// MENU SECTION
	fetch('factions/file_names.json')
		.then(response => response.json())
		.then(data => {
			const { expansion, faction, cards } = data;
			var firstRun = true;
			// Clear existing content to avoid duplication issues
			expansionTabsContainer.innerHTML = '';

			// Create expansion tabs
			expansion.folder.forEach((expansionType, expansionIndex) => {
				// Create expansion tab header
				const expansionTabHeader = document.createElement('div');
				expansionTabHeader.textContent = expansion.name[expansionIndex];
				expansionTabHeader.classList.add('expansion-header');
				expansionTabHeader.dataset.expansion = expansionType;
				if (expansionIndex === 0) expansionTabHeader.classList.add('active');
				expansionTabsContainer.appendChild(expansionTabHeader);
			});

			// Add click event listener to expansion tabs
			expansionTabsContainer.addEventListener('click', function (e) {
				if (e.target.classList.contains('expansion-header')) {
					const buttonExp = e.target.dataset.expansion;
					document.querySelectorAll('.expansion-header').forEach(h => h.classList.remove('active'));
					e.target.classList.add('active');
					loadFactions(buttonExp);
				}
			});

			if (firstRun === true) {
				loadFactions(expansion.folder[0]);
			}


			// Function to load factions based on selected expansion
			function loadFactions(expansionSet) {
				factionTabsContainer.innerHTML = '';

				const factionsInExpansion = faction[expansionSet].folder;
				const factionNamesInExpansion = faction[expansionSet].name;

				factionsInExpansion.forEach((factionType, factionIndex) => {
					// Create faction tab header
					const factionTabHeader = document.createElement('div');
					factionTabHeader.textContent = factionNamesInExpansion[factionIndex];
					factionTabHeader.classList.add('faction-header');
					factionTabHeader.dataset.faction = factionType;
					factionTabHeader.dataset.expansion = expansionSet;
					if (factionIndex === 0) factionTabHeader.classList.add('active');
					factionTabsContainer.appendChild(factionTabHeader);
				});

				// Add click event listener to faction tabs
				factionTabsContainer.addEventListener('click', function (e) {
					if (e.target.classList.contains('faction-header')) {
						const buttonExp = e.target.dataset.expansion;
						const buttonFac = e.target.dataset.faction;
						document.querySelectorAll('.faction-header').forEach(h => h.classList.remove('active'));
						e.target.classList.add('active');
						loadCardsMenu(buttonExp, buttonFac);
					}
				});

				if (firstRun) {
					loadCardsMenu(expansionSet, factionsInExpansion[0]);
				}

				// Function to load cards based on selected faction
				function loadCardsMenu(expansionSet, factionSet) {
					cardsContentsContainer.innerHTML = '';
					Object.keys(cards).forEach((cardType, cardIndex) => {
						// Create faction tab header
						const cardTabHeader = document.createElement('div');
						cardTabHeader.textContent = cardType;
						cardTabHeader.classList.add('card-header');
						cardTabHeader.dataset.faction = factionSet;
						cardTabHeader.dataset.expansion = expansionSet;
						cardTabHeader.dataset.cardType = cardType;
						if (cardIndex === 0) cardTabHeader.classList.add('active');
						cardsContentsContainer.appendChild(cardTabHeader);
					});

					// Add click event listener to faction tabs
					cardsContentsContainer.addEventListener('click', function (e) {
						if (e.target.classList.contains('card-header')) {
							const buttonExp = e.target.dataset.expansion;
							const buttonFac = e.target.dataset.faction;
							const buttonCard = e.target.dataset.cardType;
							document.querySelectorAll('.card-header').forEach(h => h.classList.remove('active'));
							e.target.classList.add('active');
							loadCards(buttonExp, buttonFac, buttonCard);
						}
					});

					if (firstRun) {
						loadCards(expansionSet, factionSet, Object.keys(cards)[0]);
					}

					function loadCards(expansionFolder, factionFolder, cardType) {
						cardsContainer.innerHTML = '';

						const subTabContents = document.createElement('div');
						subTabContents.classList.add('card-contents');
						subTabContents.id = `cards-${expansionFolder}-${factionFolder}-${cardType}`;
						cardsContainer.appendChild(subTabContents);

						fetch(`factions/${expansionFolder}/${factionFolder}/text.json`)
							.then(response => response.json())
							.then(textData => {
								console.log(textData)
								if (cardType === Object.keys(cards)[0]) {
									createCombatContent(subTabContents, expansionFolder, factionFolder, cards[cardType], textData.combatText);
								} else if (cardType === Object.keys(cards)[1]) {
									createOrdersContent(subTabContents, expansionFolder, factionFolder, cards[cardType], textData.ordersText);
								} else if (cardType === Object.keys(cards)[2]) {
									createEventContent(subTabContents, expansionFolder, factionFolder, cards[cardType], textData.eventsText);
								} else if (cardType === Object.keys(cards)[3]) {
									createFactioncardContent(subTabContents, expansionFolder, factionFolder, cards[cardType]);
								} else if (cardType === Object.keys(cards)[4]) {
									backCardContent(subTabContents, expansionFolder, factionFolder, cards[cardType]);
								}
							})
							.catch(error => console.error(`Error loading text data for ${faction} in ${expansionFolder}:`, error));
					}
				};
			};
		})
		.catch(error => console.error('Error loading file_names.json:', error));
	firstRun = false;



	//   CREATING CONTENT FOR CANVAS
	function createCombatContent(container, expansionFolder, factionfolder, files, textData) {
		const sections = {
			's-section': files.slice(0, 5),
			't1-section': files.slice(5, 9),
			't2-section': files.slice(9, 12),
			't3-section': files.slice(12, 14)
		};

		console.log(textData);
		const combatText = {
			's-section': textData.slice(0, 5),
			't1-section': textData.slice(5, 9),
			't2-section': textData.slice(9, 12),
			't3-section': textData.slice(12, 14)
		};
		console.log(combatText);

		Object.keys(sections).forEach(section => {
			const sectionContainer = document.createElement('div');
			sectionContainer.classList.add('grid', 'combat', section);
			sections[section].forEach((file, idx) => {
				// Create placeholder with spinner
				const placeholder = document.createElement('div');
				placeholder.classList.add('card-placeholder');
				const spinner = document.createElement('div');
				spinner.classList.add('card-spinner');
				placeholder.appendChild(spinner);
				sectionContainer.appendChild(placeholder);

				// Prepare card data
				const jsonData = {};
				jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/combat/${file}`;
				jsonData["title"] = combatText[section][idx].title || "";
				jsonData["background"] = combatText[section][idx].general || "";
				jsonData["foreground"] = combatText[section][idx].unit || "";
				jsonData["icons"] = combatText[section][idx].icons || "";

				// Create canvas for this card
				const canvas = document.createElement('canvas');
				canvas.width = maxWidth;
				canvas.height = maxHeight;
				const context = canvas.getContext('2d');

				// Draw the card asynchronously and replace placeholder when done
				drawCombatCard(jsonData, context).then(() => {
					placeholder.replaceWith(canvas);
				}).catch(err => {
					console.error('Error drawing combat card:', err);
					placeholder.innerHTML = '<span style="color:red;">Error loading card</span>';
				});
			});

			container.appendChild(sectionContainer);
		});
	}

	function createOrdersContent(container, expansionFolder, factionfolder, files, textData) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'orders');

		files.forEach((file, idx) => {
			// Create placeholder with spinner
			const placeholder = document.createElement('div');
			placeholder.classList.add('card-placeholder');
			const spinner = document.createElement('div');
			spinner.classList.add('card-spinner');
			placeholder.appendChild(spinner);
			categoryContainer.appendChild(placeholder);

			const jsonData = {};
			jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/orders/${file}`;
			jsonData["title"] = `${textData[idx].title}`;
			jsonData["general"] = `${textData[idx].general}`;

			const canvas = document.createElement('canvas');
			canvas.width = maxWidth;
			canvas.height = maxHeight;
			const context = canvas.getContext('2d');

			// Draw card and replace placeholder when done
			drawOrderCard(jsonData, context).then(() => {
				placeholder.replaceWith(canvas);
			}).catch(err => {
				console.error('Error drawing order card:', err);
				placeholder.innerHTML = '<span style="color:red;">Error loading card</span>';
			});
		});

		container.appendChild(categoryContainer);
	}

	function createEventContent(container, expansionFolder, factionfolder, files, textData) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'events');

		files.forEach((file, idx) => {
			// Create placeholder with spinner
			const placeholder = document.createElement('div');
			placeholder.classList.add('card-placeholder');
			const spinner = document.createElement('div');
			spinner.classList.add('card-spinner');
			placeholder.appendChild(spinner);
			categoryContainer.appendChild(placeholder);

			const jsonData = {};
			jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/events/${file}`;
			jsonData["title"] = `${textData[idx].title}`;
			jsonData["general"] = `${textData[idx].general}`;
			jsonData["type"] = `${textData[idx].type}`;

			const canvas = document.createElement('canvas');
			canvas.width = maxWidth;
			canvas.height = maxHeight;
			const context = canvas.getContext('2d');

			// Draw card and replace placeholder when done
			drawEventCard(jsonData, context).then(() => {
				placeholder.replaceWith(canvas);
			}).catch(err => {
				console.error('Error drawing event card:', err);
				placeholder.innerHTML = '<span style="color:red;">Error loading card</span>';
			});
		});

		container.appendChild(categoryContainer);
	}

	function createFactioncardContent(container, expansionFolder, factionfolder, files) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('factionCard');

		files.forEach((file, _) => {
			// Create placeholder with spinner
			const placeholder = document.createElement('div');
			placeholder.classList.add('card-placeholder');
			const spinner = document.createElement('div');
			spinner.classList.add('card-spinner');
			placeholder.appendChild(spinner);
			categoryContainer.appendChild(placeholder);

			const img = document.createElement('img');
			img.src = `factions/${expansionFolder}/${factionfolder}/faction_card/${file}`;

			img.onload = () => {
				placeholder.replaceWith(img);
			};
			img.onerror = () => {
				placeholder.innerHTML = '<span style="color:red;">Error loading image</span>';
			};
		});

		container.appendChild(categoryContainer);
	}

	function backCardContent(container, expansionFolder, factionfolder, files) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'cardBack');

		files.forEach((file, _) => {
			// Create placeholder with spinner
			const placeholder = document.createElement('div');
			placeholder.classList.add('card-placeholder');
			const spinner = document.createElement('div');
			spinner.classList.add('card-spinner');
			placeholder.appendChild(spinner);
			categoryContainer.appendChild(placeholder);

			const img = document.createElement('img');
			img.src = `factions/${expansionFolder}/${factionfolder}/backs/${file}`;
			img.width = maxWidth;
			img.height = maxHeight;

			img.onload = () => {
				placeholder.replaceWith(img);
			};
			img.onerror = () => {
				placeholder.innerHTML = '<span style="color:red;">Error loading image</span>';
			};
		});

		container.appendChild(categoryContainer);
	}


	// CANVAS TOOLS
	function replaceForbiddenStarsElements(str) {
		str = str.replace(/\[B\]/g, "}");
		str = str.replace(/\[S\]/g, "{");
		str = str.replace(/\[M\]/g, "<");
		str = str.replace(/\[D\]/g, "|");
		str = str.replace(/\(B\)/g, "#");
		str = str.replace(/\(S\)/g, "@");
		return str
	}

	function calculateTextHeight(context, text, extraHeight, marginHeight, interline, fontSize) {
		context.font = `${fontSize}px ForbiddenStars`;
		const words = text.split(' ');
		let line = '';
		let lineHeight = parseInt(context.font.match(/\d+/), 10);
		let returnHeight = 0;
		for (let n = 0; n < words.length; n++) {
			if (words[n] === "*newline*") {
				returnHeight += lineHeight + interline;
				line = '';
			}
			else if (words[n] === "*newpara*") {
				returnHeight += 2 * lineHeight;
				line = '';
			}
			else {
				const testLine = line + words[n] + ' ';
				const metrics = context.measureText(testLine);
				if (metrics.width > maxTextWidth && n > 0) {
					returnHeight += lineHeight + interline;
					line = words[n] + ' ';
				} else {
					line = testLine;
				}
			}
		}
		returnHeight += lineHeight * 2 + extraHeight + marginHeight * 2;
		return returnHeight;
	};


	function loadImage(url) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error('Failed to load image'));
			// img.src = `${url}?cb=${new Date().getTime()}`;
			img.src = url;
		});
	};

	// DRAWING CANVAS SECTION
	async function drawCombatCard(data, ctx) {
		const bottomImageheight = maxHeight * 0.025;
		const maxFieldsHeight = maxHeight * 0.4;
		const extraForegroundTriangle = maxHeight * 0.0455;
		const extraBackgroundborder = maxHeight * 0.0385;

		let interline = maxHeight * 0.0077;
		let marginHeight = maxWidth * 0.05;
		let fontSize = maxHeight * 0.03;

		// Load images from paths
		const picture = await loadImage(data.picture);
		const background = await loadImage('pictures/background.png');
		const foreground = await loadImage('pictures/foreground.png');
		const bottomImage = await loadImage('pictures/bottom.png');

		// Initial settings for margin and font size
		let backgroundTextHeight = 0;
		let foregroundTextHeight = 0;

		// Replacing all characters ForbiddenStars Related
		const backgroundWithFbElements = replaceForbiddenStarsElements(data.background)
		const foregroundWithFbElements = replaceForbiddenStarsElements(data.foreground)

		// Cards text height Declaration
		const recalculateTextHeight = () => {
			if (data.background.length > 0) {
				backgroundTextHeight = calculateTextHeight(ctx, backgroundWithFbElements, extraBackgroundborder, marginHeight, interline, fontSize);
			}
			if (data.foreground.length > 0) {
				foregroundTextHeight = calculateTextHeight(ctx, foregroundWithFbElements, extraForegroundTriangle, marginHeight, interline, fontSize);
			}
		};
		recalculateTextHeight()

		const resizeCardText = () => {
			marginHeight *= 0.8;
			fontSize *= 0.99;
			interline *= 0.95;
			recalculateTextHeight();
		};

		if (data.background.length > 0 && data.foreground.length > 0) {
			while ((backgroundTextHeight + foregroundTextHeight) > maxFieldsHeight) {
				resizeCardText();
			};
		} else {
			while (Math.max(backgroundTextHeight, foregroundTextHeight) > maxFieldsHeight) {
				resizeCardText();
			};
		};

		const drawText = (text, yPosition, extra) => {
			ctx.font = `${fontSize}px ForbiddenStars`;
			const words = text.split(' ');
			let line = '';
			let lineHeight = parseInt(ctx.font.match(/\d+/), 10);
			yPosition += marginHeight + extra + lineHeight;
			for (let n = 0; n < words.length; n++) {
				if (words[n] === "*newline*") {
					ctx.fillText(line, marginWidth, yPosition);
					yPosition += lineHeight + interline;
					line = '';
				}
				else if (words[n] === "*newpara*") {
					ctx.fillText(line, marginWidth, yPosition);
					yPosition += 2 * lineHeight;
					line = '';
				}
				else {
					const testLine = line + words[n] + ' ';
					const metrics = ctx.measureText(testLine);
					if (metrics.width > maxWidth - 2 * marginWidth && n > 0) {
						ctx.fillText(line, marginWidth, yPosition);
						yPosition += lineHeight + interline;
						line = words[n] + ' ';
					} else {
						line = testLine;
					};
				};
			};
			ctx.fillText(line, marginWidth, yPosition);
		};
		const drawImageCropped = (img, height) => {
			ctx.drawImage(img, 0, 0, textBackgroundSize, maxHeight - height, 0, height, maxWidth, maxHeight - height);
		};

		// Draw the main picture resized
		ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);

		// Draw the Title
		ctx.font = `${titleFontSize}px HeadlinerNo45`;
		ctx.fillText(data.title, maxWidth * 0.27, maxHeight * 0.077);

		if (data.background.length > 0) {
			const backgroundY = maxHeight - (backgroundTextHeight + foregroundTextHeight);
			drawImageCropped(background, backgroundY);
			drawText(backgroundWithFbElements, backgroundY, extraBackgroundborder);
		}
		if (data.foreground.length > 0) {
			const foregroundY = maxHeight - (foregroundTextHeight + extraForegroundTriangle * 0.35);
			drawImageCropped(foreground, foregroundY);
			drawText(foregroundWithFbElements, foregroundY, extraForegroundTriangle);
		}
		if (data.icons && data.icons.length > 0) {
			let currentX = startX;
			for (let letterPosition = 0; letterPosition < data.icons.length; letterPosition++) {
				const iconChar = data.icons[letterPosition].toUpperCase();
				if (iconMap[iconChar]) {
					const iconImg = await loadImage(iconMap[iconChar]);
					ctx.drawImage(iconImg, currentX, iconY, iconSize, iconSize);
					currentX += iconSize + iconSpacing;
				}
			}
		}
		ctx.drawImage(bottomImage, 0, 0, textBottomBarWidth, textBottomBarHeight, 0, maxHeight - bottomImageheight, maxWidth, bottomImageheight);
	}

	function drawOrderCard(data, ctx) {
		return new Promise((resolve, reject) => {
			const maxFieldsHeight = maxHeight * 0.455;
			const textPosition = maxHeight * 0.54;
			const marginOrderWidth = maxHeight * 0.1;

			let interline = maxHeight * 0.0077;
			let fontSize = maxHeight * 0.03;

			// Load images from paths
			const picture = new Image();
			picture.src = data.picture;

			// Initial settings for margin and font size
			let generalTextHeight = 0;

			const generalTextWithFbElements = replaceForbiddenStarsElements(data.general)

			const recalculateTextHeight = () => {
				generalTextHeight = calculateTextHeight(ctx, generalTextWithFbElements, 0, marginOrderWidth, interline, fontSize);
			};

			const resizeAllShit = () => {
				fontSize *= 0.95;
				interline *= 0.97;
				recalculateTextHeight();
			};

			recalculateTextHeight()
			while (generalTextHeight > maxFieldsHeight) {
				resizeAllShit();
			};

			const drawText = (text, yPosition) => {
				ctx.font = `${fontSize}px ForbiddenStars`;
				const words = text.split(' ');
				let line = '';
				let lineHeight = parseInt(ctx.font.match(/\d+/), 10);
				yPosition += lineHeight;
				for (let n = 0; n < words.length; n++) {
					if (words[n] === "*newline*") {
						ctx.fillText(line, maxWidth * 0.5, yPosition);
						yPosition += lineHeight + interline;
						line = '';
					}
					else if (words[n] === "*newpara*") {
						yPosition += 2 * lineHeight;
						line = '';
					}
					else {
						const testLine = line + words[n] + ' ';
						const metrics = ctx.measureText(testLine);
						if (metrics.width > maxWidth - 2 * marginOrderWidth && n > 0) {
							ctx.fillText(line, maxWidth * 0.5, yPosition);
							yPosition += lineHeight + interline;
							line = words[n] + ' ';
						} else {
							line = testLine;
						};
					};
				};
				ctx.fillText(line, maxWidth * 0.5, yPosition);
			};

			// Draw the main picture resized
			picture.onload = function () {
				ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);

				// Draw the Title
				ctx.font = `${titleFontSize}px HeadlinerNo45`;
				ctx.textAlign = "center";
				ctx.fillText(data.title, maxWidth * 0.5, maxHeight * 0.2325);

				drawText(generalTextWithFbElements, textPosition);
				resolve();
			};

			picture.onerror = function () {
				reject(new Error('Failed to load order card image'));
			};
		});
	}

	function drawEventCard(data, ctx) {
		return new Promise((resolve, reject) => {
			const maxFieldsHeight = maxHeight * 0.278;
			const textPosition = maxHeight * 0.685;

			let interline = maxHeight * 0.0077;
			let fontSize = maxHeight * 0.03;

			// Load images from paths
			const picture = new Image();
			picture.src = data.picture;

			// Initial settings for margin and font size
			let generalTextHeight = 0;

			const generalTextWithFbElements = replaceForbiddenStarsElements(data.general);

			const recalculateTextHeight = () => {
				generalTextHeight = calculateTextHeight(ctx, generalTextWithFbElements, 20, 0, interline, fontSize);
			};

			const resizeAllShit = () => {
				fontSize *= 0.95;
				interline *= 0.97;
				recalculateTextHeight()
			};

			recalculateTextHeight()
			while (generalTextHeight > maxFieldsHeight) {
				resizeAllShit();
			};

			const drawText = (text, yPosition) => {
				ctx.font = `${fontSize}px ForbiddenStars`;
				const words = text.split(' ');
				let line = '';
				let lineHeight = parseInt(ctx.font.match(/\d+/), 10);
				yPosition += lineHeight;
				for (let n = 0; n < words.length; n++) {
					if (words[n] === "*newline*") {
						ctx.fillText(line, marginWidth, yPosition);
						yPosition += lineHeight + interline;
						line = '';
					}
					else if (words[n] === "*newpara*") {
						ctx.fillText(line, marginWidth, yPosition);
						yPosition += 2 * lineHeight;
						line = '';
					}
					else {
						const testLine = line + words[n] + ' ';
						const metrics = ctx.measureText(testLine);
						if (metrics.width > maxWidth - 2 * marginWidth && n > 0) {
							ctx.fillText(line, marginWidth, yPosition);
							yPosition += lineHeight + interline;
							line = words[n] + ' ';
						} else {
							line = testLine;
						};
					};
				};
				ctx.fillText(line, marginWidth, yPosition);
			};

			// Draw the main picture resized
			picture.onload = function () {
				ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);

				// Draw the Title
				ctx.font = `${titleFontSize * 0.8}px FrizQuadrataStd`;
				ctx.textAlign = "center";
				ctx.fillText(data.type, maxWidth * 0.5, maxHeight * 0.573);
				ctx.font = `${titleFontSize}px HeadlinerNo45`;
				ctx.textAlign = "left";
				ctx.fillText(data.title, maxWidth * 0.05, maxHeight * 0.0735);

				drawText(generalTextWithFbElements, textPosition);
				resolve();
			};

			picture.onerror = function () {
				reject(new Error('Failed to load event card image'));
			};
		});
	};
});