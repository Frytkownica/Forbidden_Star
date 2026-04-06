async function preloadCanvasFonts() {
    if (!document.fonts) {
        return;
    }

    const families = ['ForbiddenStars', 'Headline', 'EventFont'];
    const fontLoads = families.map(family => document.fonts.load(`1em ${family}`));

    try {
        await Promise.all([...fontLoads, document.fonts.ready]);
    } catch (error) {
        console.warn('Some canvas fonts did not finish loading before the first draw.', error);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
	await preloadCanvasFonts();
	const expansionTabsContainer = document.getElementById('expansion-tabs');
	const factionTabsContainer = document.getElementById('faction-tabs');
	const cardsContentsContainer = document.getElementById('cards-tabs');
	const cardsContainer = document.getElementById('cards-container');
	const faqContainer = document.getElementById('faq-container');
	const faqIframe = document.getElementById('faq-frame');
	const faqFrameSource = faqIframe?.dataset?.src ?? 'faq_manuscript_page.html';
	let faqLoaded = false;

	const setFaqFrameHeight = (height) => {
		if (!faqIframe) {
			return;
		}
		const minHeight = 760; // keep a reasonable viewport while FAQ loads
		const safeHeight = Math.max(Number(height) || 0, minHeight);
		faqIframe.style.height = `${safeHeight}px`;
	};

	window.addEventListener('message', (event) => {
		if (event?.data?.type === 'faq-height') {
			setFaqFrameHeight(event.data.height);
		}
	});

	const showCardsView = () => {
		if (factionTabsContainer) factionTabsContainer.style.display = '';
		if (cardsContentsContainer) cardsContentsContainer.style.display = '';
		if (cardsContainer) cardsContainer.style.display = '';
		if (faqContainer) faqContainer.classList.remove('active');
	};

	const showFaqView = () => {
		if (factionTabsContainer) factionTabsContainer.style.display = 'none';
		if (cardsContentsContainer) cardsContentsContainer.style.display = 'none';
		if (cardsContainer) cardsContainer.style.display = 'none';
		if (faqContainer) faqContainer.classList.add('active');
		if (faqIframe && !faqLoaded) {
			faqIframe.src = faqFrameSource;
			faqLoaded = true;
		}
	};

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
	const iconSize = maxWidth * 0.097;
	const iconSpacing = maxWidth * 0.011;
	const iconX = maxWidth * 0.0632;
	const startY = maxHeight * 0.242;

	const iconMap = {
		'B': 'pictures/bolter.png',
		'S': 'pictures/shield.png',
		'M': 'pictures/moral.png'
	};

	// MENU SECTION BUILDER
	fetch('factions/general.json')
		.then(response => response.json())
		.then(generalData => {
			var firstRun = true;
			expansionTabsContainer.innerHTML = '';

			const expansionFolderList = generalData.expansion.folder;
			const expansionNameList = generalData.expansion.name;

			expansionFolderList.forEach((expansionFolder, expansionFolderIndex) => {
				const expansionTabHeader = document.createElement('div');
				expansionTabHeader.textContent = expansionNameList[expansionFolderIndex];
				expansionTabHeader.classList.add('expansion-header');
				expansionTabHeader.dataset.expansion = expansionFolder;
				if (expansionFolderIndex === 0) expansionTabHeader.classList.add('active');
				expansionTabsContainer.appendChild(expansionTabHeader);
			});

			const faqTabHeader = document.createElement('div');
			faqTabHeader.textContent = 'FAQ';
			faqTabHeader.classList.add('expansion-header');
			faqTabHeader.dataset.expansion = 'faq';
			faqTabHeader.dataset.special = 'faq';
			expansionTabsContainer.appendChild(faqTabHeader);

			expansionTabsContainer.addEventListener('click', function (e) {
				if (e.target.classList.contains('expansion-header')) {
					const isFaqTab = e.target.dataset.special === 'faq';
					const buttonExp = e.target.dataset.expansion;
					document.querySelectorAll('.expansion-header').forEach(h => h.classList.remove('active'));
					e.target.classList.add('active');
					if (isFaqTab) {
						showFaqView();
					} else {
						showCardsView();
						loadFactions(buttonExp);
					}
				}
			});

			if (firstRun === true) {
				showCardsView();
				loadFactions(expansionFolderList[0]);
			}

			function loadFactions(expansionFolder_) {
				factionTabsContainer.innerHTML = '';
				fetch('factions/' + expansionFolder_ + '/faction.json')
					.then(response => response.json())
					.then(expansionData => {

						const factionFolderList = expansionData.folder;
						const factionNameList = expansionData.name;

						factionFolderList.forEach((factionFolder, factionFolderIndex) => {
							const factionTabHeader = document.createElement('div');
							factionTabHeader.textContent = factionNameList[factionFolderIndex];
							factionTabHeader.classList.add('faction-header');
							factionTabHeader.dataset.faction = factionFolder;
							factionTabHeader.dataset.expansion = expansionFolder_;
							if (factionFolderIndex === 0) factionTabHeader.classList.add('active');
							factionTabsContainer.appendChild(factionTabHeader);
						});

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
							loadCardsMenu(expansionFolder_, factionFolderList[0]);
						}

						function loadCardsMenu(expansionFolder__, factionFolder_) {

							const cardsDefaultName = generalData.cardsDefault.name;
							const cardsDefaultReference = generalData.cardsDefault.reference;
							cardsContentsContainer.innerHTML = '';
							cardsDefaultReference.forEach((reference, referenceIndex) => {
								const cardTabHeader = document.createElement('div');
								cardTabHeader.textContent = cardsDefaultName[referenceIndex];
								cardTabHeader.classList.add('card-header');
								cardTabHeader.dataset.faction = factionFolder_;
								cardTabHeader.dataset.expansion = expansionFolder__;
								cardTabHeader.dataset.cardType = reference;
								if (referenceIndex === 0) cardTabHeader.classList.add('active');
								cardsContentsContainer.appendChild(cardTabHeader);
							});

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
								loadCards(expansionFolder__, factionFolder_, cardsDefaultReference[0]);
							}

							function loadCards(expansionFolder___, factionFolder__, cardTypeReference) {
								cardsContainer.innerHTML = '';
								const subTabContents = document.createElement('div');
								subTabContents.classList.add('card-contents');
								subTabContents.id = `cards-${expansionFolder___}-${factionFolder__}-${cardTypeReference}`;
								cardsContainer.appendChild(subTabContents);

								console.log(`Loading text.json for ${expansionFolder___}/${factionFolder__}...`);
								fetch(`factions/${expansionFolder___}/${factionFolder__}/text.json`)
									.then(response => response.ok ? response.json() : "")
									.then(textData => {
										const cardsFilenameCombatList = textData?.cards ?? generalData.filenames.combat;
										const cardsFilenameOrderList = textData?.cards ?? generalData.filenames.orders;
										const cardsFilenameEventList = textData?.cards ?? generalData.filenames.events;
										const cardsFilenameFactioncardList = textData?.cards ?? generalData.filenames.faction_card;
										const cardsFilenameBacksList = textData?.cards ?? generalData.filenames.backs;
										const cardsFilenameMapList = textData?.cards ?? generalData.filenames.map;
										const cardsOrdersText = textData?.ordersText ?? false;
										const cardsEventsText = textData?.eventsText ?? false;
										const cardsCombatText = textData?.combatText ?? false;
										if (cardTypeReference === "combat") {
											createCombatContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameCombatList, cardsCombatText);
										} else if (cardTypeReference === "orders") {
											createOrdersContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameOrderList, cardsOrdersText);
										} else if (cardTypeReference === "events") {
											createEventContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameEventList, cardsEventsText);
										} else if (cardTypeReference === "faction_card") {
											createFactioncardContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameFactioncardList);
										} else if (cardTypeReference === "backs") {
											backCardContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameBacksList);
										} else if (cardTypeReference === "map") {
											mapCardContent(subTabContents, expansionFolder___, factionFolder__, cardsFilenameMapList);
										}
									})
									.catch(error => console.error('Error loading text.json:', error));
							};
						};
					});
			};
		})
		.catch(error => console.error('Error loading file_names.json:', error));
	firstRun = false;

	function createPlaceholderWithSpinner() {
			const placeholder = document.createElement('div');
			placeholder.classList.add('card-placeholder');
			const spinner = document.createElement('div');
			spinner.classList.add('card-spinner');
			placeholder.appendChild(spinner);
			return placeholder;
	}

	//   CREATING CONTENT FOR CANVAS
	function createCombatContent(container, expansionFolder, factionfolder, files, textData) {
		const sections = {
			's-section': files[0],
			't1-section': files[1],
			't2-section': files[2],
			't3-section': files[3]
		};
		console.log(textData);
		const combatText = textData
			? {
				's-section': textData[0],
				't1-section': textData[1],
				't2-section': textData[2],
				't3-section': textData[3]
			} : false;
		console.log(combatText);
		
		Object.keys(sections).forEach(section => {
			const sectionContainer = document.createElement('div');
			sectionContainer.classList.add('grid', 'combat', section);
			sections[section].forEach((file, idx) => {
				// Create placeholder with spinner
				const placeholder = createPlaceholderWithSpinner();
				sectionContainer.appendChild(placeholder);

				// Prepare card data
				const jsonData = {};
				jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/combat/${file}`;
				if (combatText) {
					jsonData["hasText"] = true;
					jsonData["title"] = combatText[section][idx].title || "";
					jsonData["background"] = combatText[section][idx].general || "";
					jsonData["foreground"] = combatText[section][idx].unit || "";
					jsonData["icons"] = combatText[section][idx].icons || "";
				} else {
					jsonData["hasText"] = false;
				}

				const canvas = document.createElement('canvas');
				canvas.width = maxWidth;
				canvas.height = maxHeight;
				const context = canvas.getContext('2d');

				drawCombatCard(jsonData, context).then(() => {
					placeholder.replaceWith(canvas);
				}).catch(err => {
					console.error('Error drawing combat card:', err);
					placeholder.innerHTML = 'Error loading image';
				});
			});
			container.appendChild(sectionContainer);
		});
	}


	function createOrdersContent(container, expansionFolder, factionfolder, files, textData) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'orders');

		files.forEach((file, idx) => {
			const placeholder = createPlaceholderWithSpinner();
			categoryContainer.appendChild(placeholder);
			const jsonData = {};
			jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/orders/${file}`;
			if (textData) {
				jsonData["hasText"] = true;
				jsonData["title"] = `${textData[idx].title}`;
				jsonData["general"] = `${textData[idx].general}`;
			} else {
				jsonData["hasText"] = false;
			}

			const canvas = document.createElement('canvas');
			canvas.width = maxWidth;
			canvas.height = maxHeight;
			const context = canvas.getContext('2d');

			// Draw card and replace placeholder when done
			drawOrderCard(jsonData, context).then(() => {
				placeholder.replaceWith(canvas);
			}).catch(err => {
				console.error('Error drawing order card:', err);
				placeholder.innerHTML = 'Error loading image';
			});
		});

		container.appendChild(categoryContainer);
	}

	function createEventContent(container, expansionFolder, factionfolder, files, textData) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'events');

		files.forEach((file, idx) => {
			const placeholder = createPlaceholderWithSpinner();
			categoryContainer.appendChild(placeholder);
			const jsonData = {};
			jsonData["picture"] = `factions/${expansionFolder}/${factionfolder}/events/${file}`;

			if (textData) {
				jsonData["hasText"] = true;
				jsonData["title"] = `${textData[idx].title}`;
				jsonData["general"] = `${textData[idx].general}`;
				jsonData["type"] = `${textData[idx].type}`;
			} else {
				jsonData["hasText"] = false;
			}

			const canvas = document.createElement('canvas');
			canvas.width = maxWidth;
			canvas.height = maxHeight;
			const context = canvas.getContext('2d');

			// Draw card and replace placeholder when done
			drawEventCard(jsonData, context).then(() => {
				placeholder.replaceWith(canvas);
			}).catch(err => {
				console.error('Error drawing event card:', err);
				placeholder.innerHTML = 'Error loading image';
			});
		});
		container.appendChild(categoryContainer);
	}

function imageLoaderUniversal(files, maxWidth, maxHeight, pathToImage, container, categoryContainer) {
	files.forEach((file, _) => {
			const placeholder = createPlaceholderWithSpinner();
			categoryContainer.appendChild(placeholder);
			const img = document.createElement('img');
			img.src = pathToImage+file;
			if (maxWidth) img.width = maxWidth;
			if (maxHeight) img.height = maxHeight;
			img.onload = () => {
				placeholder.replaceWith(img);
			};
			img.onerror = () => {
				placeholder.innerHTML = 'Error loading image';
			};
		});
		container.appendChild(categoryContainer);
}

	function createFactioncardContent(container, expansionFolder, factionfolder, files) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid','factionCardImage');
		imageLoaderUniversal(files, maxWidth*3, false, `factions/${expansionFolder}/${factionfolder}/faction_card/`, container, categoryContainer);
	}

	function backCardContent(container, expansionFolder, factionfolder, files) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'cardBackImages');
		imageLoaderUniversal(files, maxWidth, maxHeight, `factions/${expansionFolder}/${factionfolder}/backs/`, container, categoryContainer);
	}

	function mapCardContent(container, expansionFolder, factionfolder, files) {
		const categoryContainer = document.createElement('div');
		categoryContainer.classList.add('grid', 'mapImages');
		imageLoaderUniversal(files, maxWidth*3, false, `factions/${expansionFolder}/${factionfolder}/maps/`, container, categoryContainer);
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
			img.src = url;
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error('Failed to load image'));
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

		// Draw the main picture resized
		if (!data.hasText) {
			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);

		} else {

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

			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
			ctx.font = `${titleFontSize}px Headline`;
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
				let currentY = startY;
				for (let letterPosition = 0; letterPosition < data.icons.length; letterPosition++) {
					const iconChar = data.icons[letterPosition].toUpperCase();
					if (iconMap[iconChar]) {
						const iconImg = await loadImage(iconMap[iconChar]);
						ctx.drawImage(iconImg, iconX, currentY, iconSize, iconSize);
						currentY += iconSize + iconSpacing;
					}
				}
			}
			ctx.drawImage(bottomImage, 0, 0, textBottomBarWidth, textBottomBarHeight, 0, maxHeight - bottomImageheight, maxWidth, bottomImageheight);
		}
	}

	async function drawOrderCard(data, ctx) {
		const maxFieldsHeight = maxHeight * 0.455;
		const textPosition = maxHeight * 0.54;
		const marginOrderWidth = maxHeight * 0.1;

		let interline = maxHeight * 0.0077;
		let fontSize = maxHeight * 0.03;

		// Load images from paths
		const picture = await loadImage(data.picture);

		if (!data.hasText) {
			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
		} else {

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

			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
			ctx.font = `${titleFontSize}px Headline`;
			ctx.textAlign = "center";
			ctx.fillText(data.title, maxWidth * 0.5, maxHeight * 0.2325);

			drawText(generalTextWithFbElements, textPosition);
		}
	}

	async function drawEventCard(data, ctx) {
		const maxFieldsHeight = maxHeight * 0.278;
		const textPosition = maxHeight * 0.685;

		let interline = maxHeight * 0.0077;
		let fontSize = maxHeight * 0.03;

		// Load images from paths
		const picture = await loadImage(data.picture);

		if (!data.hasText) {
			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
		} else {
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
			const drawText = (ctx_, text, yPosition) => {
				ctx_.font = `${fontSize}px ForbiddenStars`;
				const words = text.split(' ');
				let line = '';
				let lineHeight = parseInt(ctx_.font.match(/\d+/), 10);
				yPosition += lineHeight;
				for (let n = 0; n < words.length; n++) {
					if (words[n] === "*newline*") {
						ctx_.fillText(line, marginWidth, yPosition);
						yPosition += lineHeight + interline;
						line = '';
					}
					else if (words[n] === "*newpara*") {
						ctx_.fillText(line, marginWidth, yPosition);
						yPosition += 2 * lineHeight;
						line = '';
					}
					else {
						const testLine = line + words[n] + ' ';
						const metrics = ctx_.measureText(testLine);
						if (metrics.width > maxWidth - 2 * marginWidth && n > 0) {
							ctx_.fillText(line, marginWidth, yPosition);
							yPosition += lineHeight + interline;
							line = words[n] + ' ';
						} else {
							line = testLine;
						};
					};
				};
				ctx_.fillText(line, marginWidth, yPosition);
			};

			ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
			ctx.font = `${titleFontSize * 0.8}px EventFont`;
			ctx.textAlign = "center";
			ctx.fillText(data.type, maxWidth * 0.5, maxHeight * 0.573);
			ctx.font = `${titleFontSize}px Headline`;
			ctx.textAlign = "left";
			ctx.fillText(data.title, maxWidth * 0.05, maxHeight * 0.0735);
			drawText(ctx, generalTextWithFbElements, textPosition);
		}
	}
});
