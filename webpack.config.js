module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['css-loader']
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['css-loader', 'sass-loader']
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: require.resolve('mithril/route.js'),
        use: 'ignore-loader'
      }
    ]
  }
}
