import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Extract token from Bearer
    const token = authorization.replace('Bearer ', '')
    
    // Set the session for the request
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get user profile using admin client
    const { data: profile, error: profileError } = await supabaseAdmin!
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      // If profile doesn't exist, create a default one
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin!
          .from('indb_auth_user_profiles')
          .insert([{
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            role: 'user',
            email_notifications: false,
            phone_number: null
          }])
          .select()
          .single()

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            profile: newProfile,
          },
        })
      }
      
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        profile,
      },
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Update user profile using admin client
    const { data: profile, error: updateError } = await supabaseAdmin!
      .from('indb_auth_user_profiles')
      .update({
        full_name: body.full_name,
        email_notifications: body.email_notifications,
        phone_number: body.phone_number,
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      // If profile doesn't exist, create it first
      if (updateError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin!
          .from('indb_auth_user_profiles')
          .insert([{
            user_id: user.id,
            full_name: body.full_name,
            role: 'user',
            email_notifications: body.email_notifications,
            phone_number: body.phone_number
          }])
          .select()
          .single()

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          profile: newProfile,
          message: 'Profile created successfully',
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      profile,
      message: 'Profile updated successfully',
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}