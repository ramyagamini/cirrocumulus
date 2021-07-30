import {Divider, Paper} from '@material-ui/core';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import ReactMarkdown from 'markdown-to-jsx';
import React from 'react';
import {connect} from 'react-redux';
import {REACT_MD_OVERRIDES} from './util';

function LandingPage(props) {
    return <Paper elevation={0}>

        <p>Cirrocumulus is an interactive visualization tool for large-scale single-cell genomics
            data, with the following key features:</p>
        <ul>
            <li>Run on a laptop, on-premise server, cloud VM, or Google App Engine</li>
            <li>View spatial transcriptomics data overlaid on an image</li>
            <li>Share the current visualization state in a URL</li>
            <li>Share datasets securely with collaborators</li>
            <li>Create dotplots, heatmaps, and violin plots to explore relationships between categorical variables and
                expression
            </li>
            <li>Explore complete differential expression results generated by <Link target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    href="https://scanpy.readthedocs.io/">Scanpy</Link> or <Link
                target="_blank" rel="noopener noreferrer"
                href="https://pegasus.readthedocs.io/">Pegasus</Link>/<Link target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            href="https://cumulus.readthedocs.io/">Cumulus</Link>
            </li>
            <li>Interactive differential expression analysis (Mann-Whitney U test)</li>
            <li>Create and share “AND” or “OR” filters</li>
            <li>Collaboratively annotate cell types in real time</li>
            <li>Quickly load multiple features from predefined lists</li>
            <li>Explore multiple features and embeddings simultaneously</li>
            <li>Fast exploration of 2 and 3-d embeddings of millions of cells, including zoom, pan, rotate
                (3-d), and lasso tools
            </li>
            <li>Save publication quality images</li>
            <li>Highly customizable - for example, set the color map, point size, or whether to use fog for 3-d
                embeddings to fade distant points
            </li>
            <li>Visualize datasets in <Link target="_blank" rel="noopener noreferrer"
                                            href="https://anndata.readthedocs.io/">h5ad</Link>, <Link target="_blank"
                                                                                                      rel="noopener noreferrer"
                                                                                                      href="https://linnarssonlab.org/loompy/format/">loom</Link>, <Link
                target="_blank" rel="noopener noreferrer" href="https://satijalab.org/seurat/">Seurat</Link>, <Link
                target="_blank" rel="noopener noreferrer"
                href="https://tiledb.com/">TileDB</Link>, or <Link
                target="_blank" rel="noopener noreferrer"
                href="https://github.com/STAR-Fusion/STAR-Fusion/wiki">STAR-Fusion</Link> formats
            </li>
        </ul>

        <Typography variant="h5">Links</Typography>

        <ul>
            <li><Link target="_blank" rel="noopener noreferrer"
                      href="http://cirrocumulus.readthedocs.io/">Documentation</Link></li>
            <li><Link target="_blank" rel="noopener noreferrer"
                      href="https://github.com/klarman-cell-observatory/cirrocumulus">Source
                Code</Link></li>
        </ul>

        <Typography variant="h5">Primary Embedding Controls</Typography>
        <ul>
            <li>Pan: Mouse left click (2-d), right click (3-d)</li>
            <li>Rotate 3-d: Mouse left click</li>
            <li>Zoom: Mouse wheel</li>
            <li>Select: When using lasso or select tool, hold down the Ctrl or Command key to add to selection</li>
            <li>Resize: Click and drag the divider below the primary embedding</li>
        </ul>

        <Typography variant="h5">Embedding Gallery</Typography>
        <ul>
            <li>Drag charts to reorder</li>
            <li>Click chart to set primary view</li>
        </ul>
        {props.serverInfo && props.serverInfo.footer &&
        <Box><ReactMarkdown options={{overrides: REACT_MD_OVERRIDES}} children={props.serverInfo.footer}/></Box>}

        <Divider/>
        {process.env.REACT_APP_VERSION != null && <p>Version: {process.env.REACT_APP_VERSION}</p>}
    </Paper>;
}


const mapStateToProps = state => {
    return {
        serverInfo: state.serverInfo
    };
};
const mapDispatchToProps = dispatch => {
    return {};
};

export default (connect(
    mapStateToProps, mapDispatchToProps
)(LandingPage));
