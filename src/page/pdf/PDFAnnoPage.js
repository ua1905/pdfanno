import loadFiles from './loadFiles';
import { anyOf, dispatchWindowEvent } from '../../shared/util';

import {
    listenWindowLeaveEvent,
    unlistenWindowLeaveEvent,
    adjustViewerSize,
    resizeHandler,
    setupResizableColumns
} from '../util/window';

/**
 * PDFAnno's Annotation functions for Page produced by .
 */
export default class PDFAnnoPage {

    constructor() {
        this.autoBind();
        this.setup();
    }

    autoBind() {
      Object.getOwnPropertyNames(this.constructor.prototype)
        .filter(prop => typeof this[prop] === 'function')
        .forEach(method => {
          this[method] = this[method].bind(this);
        });
    }

    setup() {
        this.listenWindowEvents();
    }

    listenWindowEvents() {
        window.addEventListener('digit1Pressed' , () => {
            this.createSpan();
        });
        window.addEventListener('digit2Pressed' , () => {
            this.createRelation('one-way');
        });
        window.addEventListener('digit3Pressed' , () => {
            this.createRelation('two-way');
        });
        window.addEventListener('digit4Pressed' , () => {
            this.createRelation('link');
        });
    }

    /**
     * Start PDFAnno Application.
     */
    startViewerApplication() {

        // Alias for convenience.
        window.iframeWindow = $('#viewer iframe').get(0).contentWindow;

        iframeWindow.addEventListener('DOMContentLoaded', () => {

            // Adjust the height of viewer.
            adjustViewerSize();

            // Reset the confirm dialog at leaving page.
            unlistenWindowLeaveEvent();

            dispatchWindowEvent('iframeReady');
        });

        iframeWindow.addEventListener('pagerendered', () => {
            dispatchWindowEvent('pagerendered');
        });

        iframeWindow.addEventListener('annotationrendered', () => {

            // Restore the status of AnnoTools.
            this.disableAnnotateFunctions();
            this.enableAnnotateFunction(window.currentAnnoToolType);

            dispatchWindowEvent('annotationrendered');
        });

        // Set the confirm dialog when leaving a page.
        iframeWindow.addEventListener('annotationUpdated', () => {
            listenWindowLeaveEvent();
            dispatchWindowEvent('annotationUpdated');
        });

        // enable text input.
        iframeWindow.addEventListener('enableTextInput', (e) => {
            dispatchWindowEvent('enableTextInput', e.detail);
        });

        // disable text input.
        iframeWindow.addEventListener('disappearTextInput', () => {
            dispatchWindowEvent('disappearTextInput', e.detail);
        });

        iframeWindow.addEventListener('annotationDeleted', e => {
            dispatchWindowEvent('annotationDeleted', e.detail);
        });

        iframeWindow.addEventListener('annotationHoverIn' , e => {
            dispatchWindowEvent('annotationHoverIn', e.detail);
        });

        iframeWindow.addEventListener('annotationHoverOut' , e => {
            dispatchWindowEvent('annotationHoverOut', e.detail);
        });

        iframeWindow.addEventListener('annotationSelected' , e => {
            dispatchWindowEvent('annotationSelected', e.detail);
        });

        iframeWindow.addEventListener('annotationDeselected' , () => {
            dispatchWindowEvent('annotationDeselected');
        });

        iframeWindow.addEventListener('digit1Pressed' , () => {
            dispatchWindowEvent('digit1Pressed');
        });

        iframeWindow.addEventListener('digit2Pressed' , () => {
            dispatchWindowEvent('digit2Pressed');
        });

        iframeWindow.addEventListener('digit3Pressed' , () => {
            dispatchWindowEvent('digit3Pressed');
        });

        iframeWindow.addEventListener('digit4Pressed' , () => {
            dispatchWindowEvent('digit4Pressed');
        });
    }

    /**
     * Load files(contents and annoFiles).
     *
     * @param {Array<File>} files - files user selected in a file dialog.
     * @return {Promise}
     */
    loadFiles(files) {
        return loadFiles(files).then(result => {
            this.contentFiles = result.contents.map(c => {
                return Object.assign(c, {
                    selected : false
                });
            });
            this.annoFiles = result.annos.map(a => {
                return Object.assign(a, {
                    primary   : false,
                    reference : false
                });
            });
        });
    }

    getContentFile(name) {
        const items = this.contentFiles.filter(c => c.name === name);
        if (items.length > 0) {
            return items[0];
        }
        return null;
    }

    getAnnoFile(name) {
        const items = this.annoFiles.filter(c => c.name === name);
        if (items.length > 0) {
            return items[0];
        }
        return null;
    }

    displayContent(contentName) {

        let contentFile = this.contentFiles.filter(c => c.name === contentName);
        if (contentFile.length === 0) {
            console.log('displayContent: NOT FOUND FILE. file=', contentName);
            return;
        }

        displayViewer(contentFile[0]);
    }


    displayViewer(contentFile) {

        // Reset settings.
        this.resetPDFViewerSettings();

        // Load PDF.
        const uint8Array = new Uint8Array(contentFile.content);
        iframeWindow.PDFViewerApplication.open(uint8Array);

    }

    initializeViewer(initialPDFPath = '../pdfs/P12-1046.pdf') {

        window.pdf = null;
        window.pdfName = null;

        // Reset setting.
        this.resetPDFViewerSettings();

        let url = './pages/viewer.html';
        if (initialPDFPath) {
            url += '?file=' + initialPDFPath;
        }

        // Reload pdf.js.
        $('#viewer iframe').remove();
        $('#viewer').html('<iframe src="' + url + '" class="anno-viewer" frameborder="0"></iframe>');

    }

    closePDFViewer() {
        console.log('closePDFViewer');
        if (iframeWindow && iframeWindow.PDFViewerApplication) {
            iframeWindow.PDFViewerApplication.close();
            $('#numPages', iframeWindow.document).text('');
        }
    }

    /**
     * Reset the setting of PDFViewer.
     */
    resetPDFViewerSettings() {
        localStorage.removeItem('database');
    }

    /**
     * Create a Span annotation.
     */
    createSpan({ text = null } = {}) {

        const rects = window.iframeWindow.PDFAnnoCore.default.UI.getRectangles();

        // Check empty.
        if (!rects) {
            return alert('Please select a text span first.');
        }

        // Check duplicated.
        let annos = window.iframeWindow.annotationContainer
                        .getAllAnnotations()
                        .filter(a => a.type === 'span')
                        .filter(a => {
                            if (rects.length !== a.rectangles.length) {
                                return false;
                            }
                            for (let i = 0; i < rects.length; i++) {
                                if (rects[i].x !== a.rectangles[i].x
                                    || rects[i].y !== a.rectangles[i].y
                                    || rects[i].width !== a.rectangles[i].width
                                    || rects[i].height !== a.rectangles[i].height) {
                                    return false;
                                }
                            }
                            return true;
                        });

        if (annos.length > 0) {
            annos[0].text = text;
            annos[0].save();
            // Show label input.
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('enableTextInput', true, true, {
                uuid : annos[0].uuid,
                text : annos[0].text
            });
            window.dispatchEvent(event);
            return;
        }

        // Create a new rectAnnotation.
        window.iframeWindow.PDFAnnoCore.default.UI.createSpan({ text });
    }


    /**
     * Create a Relation annotation.
     */
    createRelation({ type, text = null } = {}) {

        // for old style.
        if (arguments.length === 1 && typeof arguments[0] === 'string') {
            type = arguments[0];
        }

        let selectedAnnotations = window.iframeWindow.annotationContainer.getSelectedAnnotations();
        selectedAnnotations = selectedAnnotations.filter(a => {
            return a.type === 'area' || a.type === 'span';
        }).sort((a1, a2) => {
            return (a1.selectedTime - a2.selectedTime); // asc
        });

        if (selectedAnnotations.length < 2) {
            return alert('Please select two annotations first.');
        }

        const first  = selectedAnnotations[selectedAnnotations.length - 2];
        const second = selectedAnnotations[selectedAnnotations.length - 1];
        console.log('first:second,', first, second);

        // Check duplicated.
        const arrows = window.iframeWindow.annotationContainer
                        .getAllAnnotations()
                        .filter(a => a.type === 'relation')
                        .filter(a => {
                            return anyOf(a.rel1Annotation.uuid, [first.uuid, second.uuid])
                                    && anyOf(a.rel2Annotation.uuid, [first.uuid, second.uuid])
                        });

        if (arrows.length > 0) {
            console.log('same found!!!');
            // Update!!
            arrows[0].direction = type;
            arrows[0].rel1Annotation = first;
            arrows[0].rel2Annotation = second;
            arrows[0].text = text;
            arrows[0].save();
            arrows[0].render();
            arrows[0].enableViewMode();
            // Show label input.
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('enableTextInput', true, true, {
                uuid : arrows[0].uuid,
                text : arrows[0].text
            });
            window.dispatchEvent(event);
            return;
        }

        window.iframeWindow.PDFAnnoCore.default.UI.createRelation({
            type,
            anno1 : first,
            anno2 : second,
            text
        });
    }

    /**
        Disable annotation tool buttons.
    */
    disableRect() {
        window.iframeWindow.PDFAnnoCore.default.UI.disableRect();
    }

    /**
     * Enable an annotation tool.
     */
    enableRect() {
        window.iframeWindow.PDFAnnoCore.default.UI.enableRect();
    }

    /**
     * Display annotations an user selected.
     */
    displayAnnotation(isPrimary) {

        // Check the viewer not clised.
        if ($('#numPages', iframeWindow.document).text() === '') {
            return;
        }


        let annotations = [];
        let colors = [];
        let primaryIndex = -1;

        // Primary annotation.
        if (isPrimary) {
            $('#dropdownAnnoPrimary a').each((index, element) => {
                let $elm = $(element);
                if ($elm.find('.fa-check').hasClass('no-visible') === false) {
                    let annoPath = $elm.find('.js-annoname').text();

                    const annoFile = window.annoPage.getAnnoFile(annoPath);
                    if (!annoFile) {
                        console.log('ERROR');
                        return;
                    }
                    primaryIndex = 0;
                    annotations.push(annoFile.content);
                    let color = null; // Use the default color used for edit.
                    colors.push(color);

                    let filename = annoFile.name;
                    localStorage.setItem('_pdfanno_primary_annoname', filename);
                    console.log('filename:', filename);
                }
            });
        }

        // Reference annotations.
        if (!isPrimary) {
            $('#dropdownAnnoReference a').each((index, element) => {
                let $elm = $(element);
                if ($elm.find('.fa-check').hasClass('no-visible') === false) {
                    let annoPath = $elm.find('.js-annoname').text();

                    const annoFile = window.annoPage.getAnnoFile(annoPath);

                    if (!annoFile) {
                        console.log('ERROR');
                        return;
                    }
                    annotations.push(annoFile.content);
                    let color = $elm.find('.js-anno-palette').spectrum('get').toHexString();
                    console.log(color);
                    colors.push(color);
                }
            });
        }

        console.log('colors:', colors);

        // Create import data.
        let paperData = {
            primary : primaryIndex,
            colors,
            annotations
        };

        // Import annotations to Viewer.
        window.annoPage.importAnnotation(paperData, isPrimary);
    }

    /**
     *  Disable annotation tool buttons.
     */
    disableAnnotateFunctions() {
        window.iframeWindow.PDFAnnoCore.default.UI.disableRect();
    }

    /**
     * Enable an annotation tool.
     */
    enableAnnotateFunction(type) {
        if (type === 'rect') {
            window.iframeWindow.PDFAnnoCore.default.UI.enableRect();
        }
    }

    /**
     * Get all annotations.
     */
    getAllAnnotations() {
        return iframeWindow.annotationContainer.getAllAnnotations();
    }

    /**
     * Get selected annotations.
     */
    getSelectedAnnotations() {
        return iframeWindow.annotationContainer.getSelectedAnnotations();
    }

    /**
     * Find an annotation by id.
     */
    findAnnotationById(id) {
        return iframeWindow.annotationContainer.findById(id);
    }

    /**
     * Clear the all annotations from the view and storage.
     */
    clearAllAnnotations() {
        if (window.iframeWindow) {
            window.iframeWindow.annotationContainer.getAllAnnotations().forEach(a => a.destroy());
        }
        localStorage.removeItem('_pdfanno_containers');
        localStorage.removeItem('_pdfanno_primary_annoname');
    }

    /**
     * Add an annotation to the container.
     */
    addAnnotation(annotation) {
        window.iframeWindow.annotationContainer.add(annotation);
    }

    /**
     * Create a new rect annotation.
     */
    createRectAnnotation(options) {
        return iframeWindow.PDFAnnoCore.default.RectAnnotation.newInstance(options);
    }

    /**
     * Create a new span annotation.
     */
    createSpanAnnotation(options) {
        return iframeWindow.PDFAnnoCore.default.SpanAnnotation.newInstance(options);
    }

    /**
     * Create a new relation annotation.
     */
    createRelationAnnotation(options) {
        return iframeWindow.PDFAnnoCore.default.RelationAnnotation.newInstance(options);
    }

    /**
     * Import annotations from UI.
     */
    importAnnotation(paperData, isPrimary) {
        iframeWindow.PDFAnnoCore.default.getStoreAdapter().importAnnotations(paperData, isPrimary).then(result => {
            iframeWindow.removeAnnoLayer();
            iframeWindow.renderAnno();
        });
    }

    /**
     * Get the export data of annotations.
     *
     * @return {Promise}
     */
    exportData() {
        return window.iframeWindow.PDFAnnoCore.default.getStoreAdapter().exportData();
    }

    /**
     * Get the viewport of the viewer.
     */
    getViewerViewport() {
        return iframeWindow.PDFView.pdfViewer.getPageView(0).viewport;
    }

    /**
     * Get the content's name displayed now.
     */
    getCurrentContentName() {
        return iframeWindow.getFileName(iframeWindow.PDFView.url);
    }

    /**
     * Manage the ctrl button is enable/disable.
     */
    manageCtrlKey(type) {

        if (type === 'on') {
            window.iframeWindow.ctrlPressed = true;

        } else if (type === 'off') {
            window.iframeWindow.ctrlPressed = false;
        }
    }

}
