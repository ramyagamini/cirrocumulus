import React from 'react';

import {connect} from 'react-redux';
import DotPlot from './DotPlot';


class DotPlotsPlotly extends React.PureComponent {
    render() {
        console.log(this.props.dotPlotData);
        return (<div>{this.props.dotPlotData.map((data, i) => {
            return <DotPlot key={i} data={data}/>;
        })}</div>);
    }
}

const mapStateToProps = state => {
    return {
        dotPlotData: state.dotPlotData
    };
};
const mapDispatchToProps = dispatch => {
    return {};
};

export default (connect(
    mapStateToProps, mapDispatchToProps,
)(DotPlotsPlotly));

