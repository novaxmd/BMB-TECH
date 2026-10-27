#!/usr/bin/env node

const fs = require( 'fs' )
const path = require( 'path' )
const glob = require( 'redstar' )

const nfzf = require( path.join( __dirname, '../src/main.js' ) )

const argv = require( 'minimist' )( process.argv.slice( 2 ) )

const pkgJSON = require( path.join( __dirname, '../package.json' ) )

if ( argv.version || argv.V || argv.v ) {
  console.log( 'nfzf version: ' + pkgJSON.version )
  process.exit()
}

if ( argv.h || argv.help ) {
  const text = fs.readFileSync( path.join( __dirname, '../usage.txt' ), 'utf8' )
  console.log( text )
  process.exit()
}

const normalMode = ( argv.n || argv.normal || argv.norm || argv.e || argv.exact)

return run()

function run ()
{
  if ( process.stdin.isTTY && !argv._.length ) {
    return glob( '**', function ( err, files, dirs ) {
      if ( err ) throw err

      const opts = {
        mode: normalMode ? 'normal' : 'fuzzy',
        list: files,

        // Start finder with given prefilled query (similar to fzf)
        query: argv.query || argv.q,
        selectOne: argv['1'] || argv['select-1'] || argv['select-one'],

        height: argv.height,
        keepRight: !!argv['keep-right'],
      }

      nfzf( opts, function ( result ) {
        if ( result.selected ) {
          console.log( files[ result.selected.index ] )
        } else if ( argv[ 'print-query' ] ) {
          console.log()
          console.log( result.query )
        }
        process.exit()
      } )
    } )
  } else {
    // update list later with input piped from stdin
    const opts = {
      mode: normalMode ? 'normal' : 'fuzzy',
      list: [], // stdin will update it later

      // Start finder with given prefilled query (similar to fzf)
      query: argv.query || argv.q,
      selectOne: argv['1'] || argv['select-1'] || argv['select-one'],

      height: argv.height,
      keepRight: !!argv['keep-right'],
    }

    opts._selectOneActive = false
    const api = nfzf( opts, function ( result ) {
      if ( result.selected ) {
        console.log( result.selected.value )
      } else if ( argv[ 'print-query' ] ) {
        console.log()
        console.log( result.query )
      }
      process.exit()
    } )

    let buffer = ''
    const list = []
    process.stdin.setEncoding( 'utf8' )

    process.stdin.on( 'data', function ( chunk ) {
      buffer += chunk

      // so you need this if you accidentally get stuck in
      // a `cat | nfzf` loop
      if (
        chunk === '\x03' || // ctrl-c
        chunk === '\x1B' // esc
      ) {
        console.log( 'exit' )
        return process.exit( 1 )
      }

      const lines = buffer.split( '\n' )
      buffer = lines.pop() || ''
      lines
      .filter( function ( t ) { return t.trim().length > 0 } )
      .forEach( function ( line ) {
        list.push( line )
      } )

      throttleUpdateList( list )
    } )

    process.stdin.on( 'end', function () {
      const lines = buffer.split( '\n' )
      lines
      .filter( function ( t ) { return t.trim().length > 0 } )
      .forEach( function ( line ) {
        list.push( line )
      } )

      api._selectOneActive = true
      api.update( list )
    } )

    function throttleUpdateList ( list ) {
      const now = Date.now()
      throttleUpdateList.time = ( throttleUpdateList.time || now )
      const delta = ( now - throttleUpdateList.time )
      if ( delta < 100 ) {} else {
        api.update( list )
      }
    }
  }
}
