import pandas as pd
from natsort import natsorted


def count(g):
    return len(g)


def non_zero(g):
    return (g > 0).sum()


class DotPlotAggregator:

    def __init__(self, measures, dimensions):
        self.category_to_df = {}
        self.measures = measures
        self.dimensions = dimensions

    def collect(self):
        results = []
        # {categories:[], name:'', values:[{name:'', fractionExpressed:0, mean:0}]}
        for key in self.category_to_df:
            df = self.category_to_df[key]
            sorted_categories = natsorted(df.index)
            df = df.loc[sorted_categories]
            values = []
            dotplot_result = {'categories': df.index.values.tolist(), 'name': key, 'values': values}
            for column in self.measures:
                series = df[column]
                mean = series['sum'].values / series['count'].values
                fraction_expressed = series['non_zero'].values / series['count'].values
                values.append({'name': column, 'fractionExpressed': fraction_expressed.tolist(),
                               'mean': mean.tolist()})
            results.append(dotplot_result)
        return results

    def add(self, df):
        df = df[self.measures + self.dimensions + ['__count']]

        for column in self.dimensions:
            summarized_df = df.groupby(column).aggregate(['sum', non_zero, count])
            summarized_df.index = summarized_df.index.astype('object')
            prior_df = self.category_to_df.get(column, None)
            first_time = prior_df is None
            summarized_df = pd.concat((prior_df, summarized_df)) if prior_df is not None else summarized_df
            if not first_time:
                summarized_df = summarized_df.groupby(summarized_df.index).agg('sum')
            self.category_to_df[column] = summarized_df
